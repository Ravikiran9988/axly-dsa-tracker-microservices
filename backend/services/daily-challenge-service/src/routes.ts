import express from 'express';
import axios from 'axios';
import prisma from './db';

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5005';
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:5002';

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.headers['x-user-role'] !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

const dailyChallengeController = {
  getTodayDailyChallenge: async (req: any, res: any) => {
    try {
      const now = new Date();
      const normalizedDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const dailyQuestion = await prisma.dailyQuestion.findUnique({ where: { date: normalizedDate } });
      if (!dailyQuestion) return res.status(404).json({ error: 'No daily challenge published yet for today.' });
      res.status(200).json({ success: true, data: dailyQuestion, questionId: dailyQuestion.questionId });
    } catch (e) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  
  runAutomationNow: async (req: any, res: any) => {
    try {
      // Orchestrate AI challenge generation via ai-service HTTP endpoint
      const aiRes = await axios.post(`${AI_SERVICE_URL}/api/ai-questions/generate`, req.body || {}, { headers: { 'x-user-role': 'admin' }});
      
      const qRes = await axios.post(`${QUESTION_SERVICE_URL}/`, aiRes.data.data, { headers: { 'x-user-role': 'admin' } });
      const canonicalQuestionId = qRes.data.id;
      
      res.status(202).json({ success: true, status: 'running', questionId: canonicalQuestionId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  // Dummy endpoints for parity
  listDailyChallenges: (req: any, res: any) => res.json({}),
  getDailyChallenge: (req: any, res: any) => res.json({}),
  createDailyChallenge: (req: any, res: any) => res.json({}),
  createDailyChallengeFromPractice: (req: any, res: any) => res.json({}),
  generateAiChallenge: async (req: any, res: any) => {
    const aiRes = await axios.post(`${AI_SERVICE_URL}/api/dsa-ai/generate`, req.body, { headers: { 'x-user-role': 'admin' }});
    res.json(aiRes.data);
  },
  generateAiTestCases: (req: any, res: any) => res.json({}),
  generateAiHints: (req: any, res: any) => res.json({}),
  validateDuplicate: (req: any, res: any) => res.json({}),
  updateDailyChallenge: (req: any, res: any) => res.json({}),
  scheduleDailyChallenge: (req: any, res: any) => res.json({}),
  publishDailyChallenge: (req: any, res: any) => res.json({}),
  publishNowDailyChallenge: (req: any, res: any) => res.json({}),
  unpublishDailyChallenge: (req: any, res: any) => res.json({}),
  deleteDailyChallenge: (req: any, res: any) => res.json({}),
  getDailyChallengeTopics: (req: any, res: any) => res.json({}),
  recommendTopic: (req: any, res: any) => res.json({}),
  getAutomationStatus: (req: any, res: any) => res.json({}),
  updateAutomationSettings: (req: any, res: any) => res.json({}),
  getAutomationLogs: (req: any, res: any) => res.json({})
};

router.get('/topics', dailyChallengeController.getDailyChallengeTopics);
router.post('/recommend-topic', requireAdmin, dailyChallengeController.recommendTopic);
router.get('/today', dailyChallengeController.getTodayDailyChallenge);

router.get('/automation/status', requireAdmin, dailyChallengeController.getAutomationStatus);
router.patch('/automation/settings', requireAdmin, dailyChallengeController.updateAutomationSettings);
router.post('/automation/run-now', requireAdmin, dailyChallengeController.runAutomationNow);
router.get('/automation/logs', requireAdmin, dailyChallengeController.getAutomationLogs);

router.get('/', dailyChallengeController.listDailyChallenges);
router.post('/from-practice', requireAdmin, dailyChallengeController.createDailyChallengeFromPractice);
router.post('/generate-ai', requireAdmin, dailyChallengeController.generateAiChallenge);
router.post('/generate-ai/test-cases', requireAdmin, dailyChallengeController.generateAiTestCases);
router.post('/generate-ai/hints', requireAdmin, dailyChallengeController.generateAiHints);
router.post('/validate-duplicate', requireAdmin, dailyChallengeController.validateDuplicate);
router.post('/', requireAdmin, dailyChallengeController.createDailyChallenge);

router.get('/:id', dailyChallengeController.getDailyChallenge);
router.put('/:id', requireAdmin, dailyChallengeController.updateDailyChallenge);
router.post('/:id/schedule', requireAdmin, dailyChallengeController.scheduleDailyChallenge);
router.post('/:id/publish', requireAdmin, dailyChallengeController.publishDailyChallenge);
router.post('/:id/publish-now', requireAdmin, dailyChallengeController.publishNowDailyChallenge);
router.post('/:id/unpublish', requireAdmin, dailyChallengeController.unpublishDailyChallenge);
router.delete('/:id/permanent', requireAdmin, dailyChallengeController.deleteDailyChallenge);
router.delete('/:id', requireAdmin, dailyChallengeController.deleteDailyChallenge);

// Test routes mapping
router.post('/trigger', dailyChallengeController.runAutomationNow);

export default router;
