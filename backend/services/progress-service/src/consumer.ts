import { RabbitMQClient } from 'shared';
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
    async (msg: any, correlationId: string) => {
      console.log(`[${correlationId}] Processing submission.completed for user ${msg.userId}`);
      
      // In a real system, you'd track processed submissionIds to prevent double counting.
      if (msg.status !== 'solved') {
        console.log(`[${correlationId}] Submission not successful. Skipping.`);
        // We might want to update PracticeUserProgress to 'attempted' but we'll focus on success here
        return;
      }

      // 1. Upsert PracticeUserProgress
      await prisma.practiceUserProgress.upsert({
        where: {
          userId_questionId: {
            userId: msg.userId,
            questionId: msg.questionId
          }
        },
        update: {
          status: 'solved',
          attemptCount: { increment: 1 },
          lastAttemptedAt: new Date(),
          solvedAt: new Date(),
        },
        create: {
          userId: msg.userId,
          questionId: msg.questionId,
          status: 'solved',
          attemptCount: 1,
          firstAttemptedAt: new Date(),
          lastAttemptedAt: new Date(),
          solvedAt: new Date(),
        }
      });

      // 2. Points ledger
      // For simplicity, checking if ledger exists for this solve
      const existingLedger = await prisma.pointsLedger.findFirst({
        where: {
          userId: msg.userId,
          sourceType: 'PRACTICE_SOLVE',
          sourceId: msg.questionId
        }
      });

      let newScore = 0;
      let pointsAwarded = 0;

      if (!existingLedger) {
        pointsAwarded = 10;
        await prisma.pointsLedger.create({
          data: {
            userId: msg.userId,
            sourceType: 'PRACTICE_SOLVE',
            sourceId: msg.questionId,
            points: pointsAwarded,
            category: 'practice',
            reason: 'Solved practice question'
          }
        });

        // 3. Upsert UserStats
        const stats = await prisma.userStats.upsert({
          where: { userId: msg.userId },
          update: {
            points: { increment: pointsAwarded },
            practicePoints: { increment: pointsAwarded },
            leaderboardScore: { increment: pointsAwarded }
          },
          create: {
            userId: msg.userId,
            points: pointsAwarded,
            practicePoints: pointsAwarded,
            leaderboardScore: pointsAwarded
          }
        });
        newScore = stats.leaderboardScore;
      } else {
        const stats = await prisma.userStats.findUnique({ where: { userId: msg.userId } });
        newScore = stats?.leaderboardScore || 0;
      }

      // Update Redis Leaderboard (Sorted Set)
      await redisClient.zAdd('leaderboard', {
        score: newScore,
        value: msg.userId
      });

      if (pointsAwarded > 0) {
        // Emit new event
        await mq.publish('events', 'user.progress.updated', {
          userId: msg.userId,
          newScore: newScore
        }, correlationId);
      }
    }
  );
};
