import express from 'express';
const dsaAiController = require('./dsaAiController');
const aiQuestionController = require('./aiQuestionController');

const router = express.Router();

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.headers['x-user-role'] !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// DSA AI Routes (/api/dsa-ai/*) mapped directly at root here since gateway prefixes it.
// Actually, wait, gateway forwards the path AS IS, meaning it sends /api/dsa-ai to the target!
// Let's create sub-routers to match the monolith precisely.

const dsaAiRouter = express.Router();
dsaAiRouter.post('/analyze', dsaAiController.analyzeQuestion);
dsaAiRouter.post('/generate', dsaAiController.generateGuidance);
dsaAiRouter.post('/coach', dsaAiController.coach);
dsaAiRouter.post('/verify', dsaAiController.verifyCode);

const aiQuestionRouter = express.Router();
aiQuestionRouter.use(requireAdmin);
aiQuestionRouter.post('/generate', aiQuestionController.generate);
aiQuestionRouter.post('/question-bank/manual', aiQuestionController.generateQuestionBankManual);
aiQuestionRouter.get('/question-bank/status', aiQuestionController.getQuestionBankGenerationStatus);
aiQuestionRouter.get('/question-bank/automation/settings', aiQuestionController.getSettings);
aiQuestionRouter.patch('/question-bank/automation/settings', aiQuestionController.updateSettings);
aiQuestionRouter.get('/question-bank/automation/logs', aiQuestionController.getLogs);

router.use('/api/dsa-ai', dsaAiRouter);
router.use('/api/ai-questions', aiQuestionRouter);

router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

export default router;
