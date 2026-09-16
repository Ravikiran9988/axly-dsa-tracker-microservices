import express from 'express';
import axios from 'axios';
import prisma from './db';
import { RabbitMQClient } from 'shared';

const router = express.Router();
const EXECUTION_SERVICE_URL = process.env.EXECUTION_SERVICE_URL || 'http://localhost:5004';

router.post('/', async (req, res) => {
  // Assume Gateway handles auth and sets this header
  const userId = req.headers['x-user-id'] as string;
  const correlationId = req.headers['x-correlation-id'] as string || 'system';

  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { questionId, language, code } = req.body;
  
  if (!questionId || !language || !code) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Send code to Execution Service
    const executionResponse = await axios.post(EXECUTION_SERVICE_URL, {
      language,
      code,
    });
    
    const result = executionResponse.data;

    // 2. Save result to database
    const submission = await prisma.submission.create({
      data: {
        userId,
        questionId,
        code,
        language,
        status: result.status,
        executionTime: result.executionTime,
        error: result.error || null,
      },
    });

    // 3. Emit Async Event
    const mq = RabbitMQClient.getInstance();
    await mq.publish('events', 'submission.completed', {
      submissionId: submission.id,
      userId: submission.userId,
      questionId: submission.questionId,
      status: submission.status,
      executionTime: submission.executionTime
    }, correlationId);

    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

router.get('/', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const submissions = await prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
