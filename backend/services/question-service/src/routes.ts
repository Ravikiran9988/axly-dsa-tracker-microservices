import express from 'express';
import prisma from './db';
import { RabbitMQClient } from 'shared';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const questions = await prisma.question.findMany({
      select: { id: true, title: true, difficulty: true, slug: true },
    });
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let question = await prisma.question.findUnique({
      where: { id: idOrSlug },
      include: { testCases: true }
    });
    if (!question) {
      question = await prisma.question.findUnique({
        where: { slug: idOrSlug },
        include: { testCases: true }
      });
    }

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

  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { title, slug, description, difficulty, constraints, starterCode, inputFormat, outputFormat } = req.body;
    const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const question = await prisma.question.create({
      data: {
        title,
        slug: generatedSlug,
        description,
        difficulty: difficulty || 'easy',
        constraints: JSON.stringify(constraints || []),
        starterCode: starterCode || {},
        inputFormat,
        outputFormat
      },
    });

    const mq = RabbitMQClient.getInstance();
    await mq.publish('events', 'question.created', {
      questionId: question.id,
      title: question.title
    }, correlationId);

    res.status(201).json(question);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// INTERNAL routes for execution/submission services
router.get('/internal/:id/testcases', async (req, res) => {
  try {
    const testCases = await prisma.questionTestCase.findMany({
      where: { questionId: req.params.id, isHidden: false }
    });
    res.status(200).json(testCases);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/internal/:id/all-testcases', async (req, res) => {
  try {
    const testCases = await prisma.questionTestCase.findMany({
      where: { questionId: req.params.id }
    });
    res.status(200).json(testCases);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Test Cases Management
router.post('/:id/testcases', async (req, res) => {
  if (req.headers['x-user-role'] !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { input, expectedOutput, isHidden } = req.body;
    const testCase = await prisma.questionTestCase.create({
      data: { questionId: req.params.id, input, expectedOutput, isHidden: isHidden || false }
    });
    res.status(201).json(testCase);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/testcases/:id', async (req, res) => {
  if (req.headers['x-user-role'] !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    await prisma.questionTestCase.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
