import express from 'express';
import { executeJavascript } from './execute';

const router = express.Router();

router.post('/', async (req, res) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: 'Language and code are required' });
  }

  if (language !== 'javascript' && language !== 'nodejs') {
    return res.status(400).json({ error: 'Unsupported language. Only javascript is currently supported.' });
  }

  try {
    // 3 seconds timeout
    const result = await executeJavascript(code, 3000);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Execution service error' });
  }
});

export default router;
