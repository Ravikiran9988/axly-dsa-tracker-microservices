import express from 'express';
import redisClient from './redis';
import prisma from './db';
import { getMine } from './controllers/analyticsController';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'Progress Service OK' });
});

router.get('/analytics/mine', getMine);

router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await redisClient.zRangeWithScores('leaderboard', 0, 9, { REV: true });
    res.status(200).json(topUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
