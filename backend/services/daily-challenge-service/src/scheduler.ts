import axios from 'axios';
import prisma from './db';
import cron from 'node-cron';
import { RabbitMQClient } from 'shared';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5005';
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:5002';

export const generateAndPublishDailyChallenge = async (date: Date, correlationId: string = 'system') => {
  // Normalize date to 00:00:00 UTC for idempotency check
  const normalizedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  // 1. Idempotency Check: Did we already generate one for today?
  const existing = await prisma.dailyChallenge.findUnique({
    where: { date: normalizedDate }
  });

  if (existing) {
    console.log(`Challenge for ${normalizedDate.toISOString()} already exists. Skipping.`);
    return existing;
  }

  try {
    // 2. Call AI Service to generate a question
    const aiRes = await axios.post(`${AI_SERVICE_URL}/generate`, {
      difficulty: "MEDIUM",
      topic: "Arrays", 
      pattern: "Two Pointers"
    });

    const generatedQuestion = aiRes.data;

    // 3. Persist the Canonical Question to Question Service
    const qRes = await axios.post(`${QUESTION_SERVICE_URL}/`, generatedQuestion, {
      headers: { 'x-user-role': 'ADMIN', 'x-correlation-id': correlationId }
    });

    const canonicalQuestionId = qRes.data.id;

    // 4. Save local reference in Daily Challenge DB
    const challenge = await prisma.dailyChallenge.create({
      data: {
        date: normalizedDate,
        questionId: canonicalQuestionId,
        status: 'PUBLISHED'
      }
    });

    // 5. Emit Event
    const mq = RabbitMQClient.getInstance();
    await mq.publish('events', 'challenge.published', {
      challengeId: challenge.id,
      questionId: challenge.questionId,
      date: challenge.date.toISOString()
    }, correlationId);

    console.log(`Successfully generated and published Daily Challenge ${challenge.id}`);
    return challenge;
  } catch (error) {
    console.error("Failed to generate daily challenge:", error);
    throw error;
  }
};

// Setup cron to run at midnight UTC everyday
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
