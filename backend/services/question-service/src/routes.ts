import express from 'express';
import prisma from './db';
import { RabbitMQClient } from 'shared';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const questions = await prisma.question.findMany({
      select: { id: true, title: true, difficulty: true },
    });
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id },
    });
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(200).json(question);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  // Assume gateway handles auth, we check role from header
  const userRole = req.headers['x-user-role'];
  const correlationId = req.headers['x-correlation-id'] as string || 'system';

  if (userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { title, description, difficulty, examples, constraints, starterCode } = req.body;
    const question = await prisma.question.create({
      data: {
        title,
        description,
        difficulty: difficulty || 'EASY',
        examples: examples || [],
        constraints: constraints || [],
        starterCode: starterCode || {},
      },
    });

    const mq = RabbitMQClient.getInstance();
    await mq.publish('events', 'question.created', {
      questionId: question.id,
      title: question.title
    }, correlationId);

    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
