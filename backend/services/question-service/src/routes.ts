import express from 'express';
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getTopics,
  getQuestionVersions,
  getQuestionVersion,
  restoreQuestionVersion
} from './controllers/questionController';
import prisma from './db';

const router = express.Router();

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.headers['x-user-role'] !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Public Routes
router.get('/', getQuestions);
router.get('/topics', getTopics);
router.get('/:id', getQuestionById);

// Admin Routes
router.post('/', requireAdmin, createQuestion);
router.put('/:id', requireAdmin, updateQuestion);
router.patch('/:id', requireAdmin, updateQuestion);
router.delete('/:id', requireAdmin, deleteQuestion);

// Versioning Routes (Admin)
router.get('/:id/versions', requireAdmin, getQuestionVersions);
router.get('/:id/versions/:version', requireAdmin, getQuestionVersion);
router.post('/:id/versions/:version/restore', requireAdmin, restoreQuestionVersion);


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
router.post('/:id/testcases', requireAdmin, async (req, res) => {
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

router.delete('/testcases/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.questionTestCase.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
