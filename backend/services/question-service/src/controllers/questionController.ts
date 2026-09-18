import { Request, Response } from 'express';
import prisma from '../db';
import { RabbitMQClient } from 'shared';

export const getQuestions = async (req: Request, res: Response) => {
  try {
    const { difficulty, topic_id, search, limit = 50, page = 1 } = req.query;
    
    let where: any = { isActive: true };
    if (difficulty) where.difficulty = difficulty as string;
    if (topic_id) where.topicId = topic_id as string;
    if (search) {
      where.title = { contains: search as string, mode: 'insensitive' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: Number(limit),
        include: { topic: true, pattern: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.question.count({ where })
    ]);

    res.status(200).json({ questions, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuestionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let question = await prisma.question.findUnique({
      where: { id },
      include: { topic: true, pattern: true, testCases: true }
    });

    if (!question) {
      question = await prisma.question.findUnique({
        where: { slug: id },
        include: { topic: true, pattern: true, testCases: true }
      });
    }

    if (!question) return res.status(404).json({ error: 'Question not found' });
    
    // Hide private test cases if not admin
    if (req.headers['x-user-role'] !== 'admin') {
      question.testCases = question.testCases.filter(tc => !tc.isHidden);
    }
    
    res.status(200).json(question);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const generatedSlug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const createdBy = req.headers['x-user-id'] as string;
    const correlationId = req.headers['x-correlation-id'] as string || 'system';

    const question = await prisma.question.create({
      data: {
        title: data.title,
        slug: generatedSlug,
        difficulty: data.difficulty || 'easy',
        description: data.description,
        problemStatement: data.problemStatement,
        constraints: data.constraints ? JSON.stringify(data.constraints) : null,
        topicId: data.topicId,
        hints: data.hints ? data.hints : [],
        createdBy,
        version: 1,
        currentVersion: 1
      }
    });

    await prisma.questionVersion.create({
      data: {
        questionId: question.id,
        version: 1,
        title: question.title,
        description: question.description,
        changeSummary: 'Initial creation',
        changedBy: createdBy
      }
    });

    await RabbitMQClient.getInstance().publish('events', 'question.created', { questionId: question.id }, correlationId);

    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const changedBy = req.headers['x-user-id'] as string;
    
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Question not found' });

    const newVersion = existing.currentVersion + 1;

    const question = await prisma.question.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        description: data.description !== undefined ? data.description : existing.description,
        difficulty: data.difficulty !== undefined ? data.difficulty : existing.difficulty,
        topicId: data.topicId !== undefined ? data.topicId : existing.topicId,
        currentVersion: newVersion
      }
    });

    await prisma.questionVersion.create({
      data: {
        questionId: question.id,
        version: newVersion,
        title: question.title,
        description: question.description,
        changeSummary: data.changeSummary || 'Updated question details',
        changedBy
      }
    });

    await RabbitMQClient.getInstance().publish('events', 'question.updated', { questionId: question.id });

    res.status(200).json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    await prisma.question.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.status(200).json({ message: 'Question deleted successfully (soft delete)' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTopics = async (req: Request, res: Response) => {
  try {
    const topics = await prisma.topic.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: { patterns: true }
    });
    res.status(200).json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuestionVersions = async (req: Request, res: Response) => {
  try {
    const versions = await prisma.questionVersion.findMany({
      where: { questionId: req.params.id },
      orderBy: { version: 'desc' }
    });
    res.status(200).json(versions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuestionVersion = async (req: Request, res: Response) => {
  try {
    const version = await prisma.questionVersion.findUnique({
      where: { questionId_version: { questionId: req.params.id, version: Number(req.params.version) } }
    });
    if (!version) return res.status(404).json({ error: 'Version not found' });
    res.status(200).json(version);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const restoreQuestionVersion = async (req: Request, res: Response) => {
  try {
    const targetVersion = await prisma.questionVersion.findUnique({
      where: { questionId_version: { questionId: req.params.id, version: Number(req.params.version) } }
    });
    if (!targetVersion) return res.status(404).json({ error: 'Version not found' });

    const newCurrent = await prisma.question.findUnique({ where: { id: req.params.id }});
    const newVersionNum = newCurrent!.currentVersion + 1;

    const restored = await prisma.question.update({
      where: { id: req.params.id },
      data: {
        title: targetVersion.title,
        description: targetVersion.description,
        currentVersion: newVersionNum
      }
    });

    await prisma.questionVersion.create({
      data: {
        questionId: restored.id,
        version: newVersionNum,
        title: restored.title,
        description: restored.description,
        changeSummary: `Restored to version ${targetVersion.version}`,
        changedBy: req.headers['x-user-id'] as string
      }
    });

    res.status(200).json({ message: 'Restored successfully', question: restored });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
