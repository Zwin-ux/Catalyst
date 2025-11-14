import { Router, Request, Response } from 'express';
import { trackVoiceTime, voteContribution, calculateKing } from '../services/pointsService';

const router = Router();

// POST /points/voice
router.post('/voice', async (req: Request, res: Response) => {
  const { userId, seconds } = req.body;
  if (!userId || typeof seconds !== 'number') {
    return res.status(400).json({ error: 'Missing userId or seconds' });
  }
  const pts = await trackVoiceTime(userId, seconds);
  res.status(200).json({ pts });
});

// POST /points/vote
router.post('/vote', async (req: Request, res: Response) => {
  const { voterId, targetId } = req.body;
  if (!voterId || !targetId) {
    return res.status(400).json({ error: 'Missing voterId or targetId' });
  }
  const pts = await voteContribution(voterId, targetId);
  res.status(200).json({ pts });
});

// GET /points/king?start=timestamp
router.get('/king', async (req: Request, res: Response) => {
  const { start } = req.query;
  if (!start) {
    return res.status(400).json({ error: 'Missing period start' });
  }
  const king = await calculateKing(new Date(start as string));
  res.status(200).json({ king });
});

export default router;
