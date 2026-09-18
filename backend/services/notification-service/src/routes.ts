import express from 'express';
import redisClient from './redis';
import prisma from './db';
import { getMine } from './controllers/analyticsController';

const router = express.Router();

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.headers['x-user-role'] !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

router.get('/health', (req, res) => {
  res.json({ status: 'Progress Service OK' });
});

// Analytics routes
router.get('/analytics/mine', getMine);

router.get('/analytics/overview', requireAdmin, async (req, res) => {
  // Stub for platform overview
  res.json({ success: true, data: {} });
});

router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await redisClient.zRangeWithScores('leaderboard', 0, 9, { REV: true });
    res.status(200).json(topUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Progress routes
router.get('/progress/mine', async (req, res) => {
  // Return simple summary mapping from user stats
  try {
    const userId = req.headers['x-user-id'] as string;
    const stats = await prisma.userStats.findUnique({ where: { userId }});
    res.json({ success: true, data: stats || {} });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/progress/admin', requireAdmin, async (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/progress/admin/stats', requireAdmin, async (req, res) => {
  res.json({ success: true, data: {} });
});

export default router;
