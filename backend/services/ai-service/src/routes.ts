import express from 'express';
const dsaAiController = require('./dsaAiController');
const aiQuestionController = require('./aiQuestionController');

const router = express.Router();

router.post('/dsa/chat', dsaAiController.chatWithCoach);
router.post('/dsa/hint', dsaAiController.getHint);
router.post('/dsa/complexity', dsaAiController.analyzeComplexity);

router.post('/questions/generate', aiQuestionController.generateQuestion);
router.post('/questions/batch', aiQuestionController.generateBatch);
router.post('/questions/validate', aiQuestionController.validateExisting);

// Internal API endpoint for other services if needed
router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

export default router;
