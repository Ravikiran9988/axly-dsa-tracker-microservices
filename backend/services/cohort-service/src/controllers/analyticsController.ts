import { Request, Response } from 'express';
import prisma from '../db';

export const getMine = async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Fetch User Stats
    const stats = await prisma.userStats.findUnique({
      where: { userId }
    });

    // 2. Fetch Practice Progress summary
    const practiceProgress = await prisma.practiceUserProgress.findMany({
      where: { userId }
    });

    const totalSubmissions = practiceProgress.reduce((sum, p) => sum + p.attemptCount, 0);
    const solvedSubmissions = practiceProgress.filter(p => p.status === 'solved').length;
    const totalAttempts = practiceProgress.length;
    const successPercentage = totalSubmissions > 0 ? Math.round((solvedSubmissions / totalSubmissions) * 100) : (solvedSubmissions > 0 ? 100 : 0);

    // 3. Activity (last 30 days) from ledger
    const ledger = await prisma.pointsLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const activityMap: Record<string, { date: string, submissions: number, solved: number }> = {};
    for (const l of ledger) {
      const dateStr = l.createdAt.toISOString().slice(0, 10);
      if (!activityMap[dateStr]) {
        activityMap[dateStr] = { date: dateStr, submissions: 1, solved: l.sourceType === 'PRACTICE_SOLVE' ? 1 : 0 };
      } else {
        activityMap[dateStr].submissions += 1;
        if (l.sourceType === 'PRACTICE_SOLVE') activityMap[dateStr].solved += 1;
      }
    }
    const activity = Object.values(activityMap).slice(0, 30);

    res.status(200).json({
      data: {
        summary: {
          total_submissions: totalSubmissions,
          total_attempts: totalAttempts,
          solved_submissions: solvedSubmissions,
          success_percentage: successPercentage,
          streak: stats?.streak || 0,
          longest_streak: stats?.longestStreak || 0,
          individual_streak: stats?.individualStreak || 0,
          individual_best_streak: stats?.individualBestStreak || 0,
          daily_challenge_streak: stats?.dailyChallengeStreak || 0,
          daily_challenge_best_streak: stats?.dailyChallengeBestStreak || 0,
          points: stats?.points || 0,
          total_score: stats?.points || 0,
          practice_points: stats?.practicePoints || 0,
          daily_challenge_points: stats?.dailyChallengePoints || 0,
          streak_bonus: stats?.streakBonus || 0,
          leaderboard_score: stats?.leaderboardScore || 0
        },
        streaks: {
          individualStreak: stats?.individualStreak || 0,
          individualBestStreak: stats?.individualBestStreak || 0,
          dailyChallengeStreak: stats?.dailyChallengeStreak || 0,
          dailyChallengeBestStreak: stats?.dailyChallengeBestStreak || 0,
        },
        difficulty_breakdown: [], 
        topic_breakdown: [], 
        weak_topics: [],
        activity
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
