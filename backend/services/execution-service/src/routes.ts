import express from 'express';
import { executeCode } from './execute';

const router = express.Router();

router.post('/', async (req, res) => {
  const { language, code, testCases } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: 'Language and code are required' });
  }

  try {
    const result = await executeCode(language, code, testCases || []);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Execution service error', details: error.message });
  }
});

export default router;
