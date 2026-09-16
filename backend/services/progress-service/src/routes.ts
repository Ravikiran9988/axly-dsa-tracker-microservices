import express from 'express';
import redisClient from './redis';

const router = express.Router();

router.get('/leaderboard', async (req, res) => {
  try {
    // Get top 10 from Redis
    const topUsers = await redisClient.zRangeWithScores('leaderboard', 0, 9, { REV: true });
    res.status(200).json(topUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
