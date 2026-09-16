import axios from 'axios';
import prisma from './db';
import cron from 'node-cron';
import { RabbitMQClient } from 'shared';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5005';
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:5002';

export const generateAndPublishDailyChallenge = async (date: Date, correlationId: string = 'system') => {
  const normalizedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const existing = await prisma.dailyQuestion.findUnique({
    where: { date: normalizedDate }
  });

  if (existing) {
    console.log(`Challenge for ${normalizedDate.toISOString()} already exists. Skipping.`);
    return existing;
  }

  try {
    // Note: AI integration placeholder; would normally generate a full DailyChallengeProblem payload
    const slug = `daily-challenge-${normalizedDate.toISOString().split('T')[0]}`;
    
    // Create the Daily Challenge Problem locally
    const challenge = await prisma.dailyChallengeProblem.create({
      data: {
        title: `Daily Challenge ${normalizedDate.toISOString().split('T')[0]}`,
        slug,
        description: 'Auto-generated challenge description',
        difficulty: 'medium',
        createdVia: 'ai',
        status: 'published',
        scheduledDate: normalizedDate
      }
    });

    // Create a canonical question in Question Service if it doesn't exist
    let canonicalQuestionId: string | null = null;
    try {
      const qRes = await axios.post(`${QUESTION_SERVICE_URL}/`, {
        title: challenge.title,
        slug: challenge.slug,
        description: challenge.description,
        difficulty: challenge.difficulty
      }, {
        headers: { 'x-user-role': 'admin', 'x-correlation-id': correlationId }
      });
      canonicalQuestionId = qRes.data.id;
    } catch (e: any) {
      console.warn("Could not create canonical question, proceeding with null", e.message);
    }

    const dailyQuestion = await prisma.dailyQuestion.create({
      data: {
        date: normalizedDate,
        challengeId: challenge.id,
        questionId: canonicalQuestionId
      }
    });

    const mq = RabbitMQClient.getInstance();
    await mq.publish('events', 'challenge.published', {
      dailyQuestionId: dailyQuestion.id,
      challengeId: challenge.id,
      questionId: canonicalQuestionId,
      date: dailyQuestion.date.toISOString()
    }, correlationId);

    console.log(`Successfully generated and published Daily Challenge ${dailyQuestion.id}`);
    return dailyQuestion;
  } catch (error) {
    console.error("Failed to generate daily challenge:", error);
    throw error;
  }
};

export const startScheduler = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily challenge automation job...');
    try {
      await generateAndPublishDailyChallenge(new Date());
    } catch (e) {
      console.error('Job failed', e);
    }
  });
};
