import express from 'express';
import prisma from './db';
import { generateAndPublishDailyChallenge } from './scheduler';

const router = express.Router();

router.get('/today', async (req, res) => {
  try {
    const now = new Date();
    const normalizedDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const challenge = await prisma.dailyChallenge.findUnique({
      where: { date: normalizedDate }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'No daily challenge published yet for today.' });
    }

    res.status(200).json(challenge);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual trigger for testing or admin overrides
router.post('/trigger', async (req, res) => {
  try {
    const challenge = await generateAndPublishDailyChallenge(new Date());
    res.status(200).json(challenge);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to trigger automation', details: error.message });
  }
});

export default router;
