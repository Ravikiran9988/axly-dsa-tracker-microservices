import { RabbitMQClient, SubmissionCompletedEvent } from 'shared';
import prisma from './db';
import redisClient from './redis';

export const setupConsumers = async (rabbitmqUrl: string) => {
  const mq = RabbitMQClient.getInstance();
  await mq.connect(rabbitmqUrl);

  // Consume submission.completed events
  await mq.consume(
    'progress_submission_completed_q',
    'events',
    'submission.completed',
    async (msg: SubmissionCompletedEvent, correlationId: string) => {
      console.log(`[${correlationId}] Processing submission.completed for user ${msg.userId}`);
      
      // Idempotency: skip if status is not SUCCESS. 
      // In a real system, you'd track processed submissionIds to prevent double counting.
      if (msg.status !== 'SUCCESS') {
        console.log(`[${correlationId}] Submission not successful. Skipping.`);
        return;
      }

      // We will perform a simple upsert
      const progress = await prisma.userProgress.upsert({
        where: { userId: msg.userId },
        update: {
          solvedCount: { increment: 1 },
          totalScore: { increment: 10 },
          lastUpdated: new Date()
        },
        create: {
          userId: msg.userId,
          solvedCount: 1,
          totalScore: 10,
        }
      });

      // Update Redis Leaderboard (Sorted Set)
      await redisClient.zAdd('leaderboard', {
        score: progress.totalScore,
        value: progress.userId
      });

      // Emit new event
      await mq.publish('events', 'user.progress.updated', {
        userId: msg.userId,
        newScore: progress.totalScore
      }, correlationId);
    }
  );
};
