import { Router } from 'express';
import { getLeaderboard, getUserStats } from '../services/leaderboardService';

const router = Router();

// GET /leaderboard?period=day|week
router.get('/', async (req, res) => {
  const { period } = req.query;
  const data = await getLeaderboard(period as string || 'day');
  res.status(200).json({ leaderboard: data });
});

// GET /leaderboard/user/:id
router.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  const stats = await getUserStats(id);
  res.status(200).json({ stats });
});

export default router;
