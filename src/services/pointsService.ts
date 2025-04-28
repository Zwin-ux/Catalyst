import { v4 as uuidv4 } from 'uuid';
import pool from '../utils/db';

export async function trackVoiceTime(userId: string, seconds: number): Promise<number> {
  const pts = Math.floor(seconds / 30);
  if (pts <= 0) return 0;
  // Cap: max 60 points per hour per user
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(points),0) as total
     FROM point_events
     WHERE user_id = $1 AND type = 'voiceTime' AND timestamp >= NOW() - INTERVAL '1 hour'`,
    [userId]
  );
  const earnedThisHour = Number(rows[0].total);
  const cap = 60;
  const available = Math.max(0, cap - earnedThisHour);
  const toAward = Math.min(pts, available);
  if (toAward > 0) {
    await pool.query(
      `INSERT INTO point_events (id, user_id, type, points, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [uuidv4(), userId, 'voiceTime', toAward]
    );
  }
  return toAward;
}

export async function voteContribution(voterId: string, targetId: string): Promise<number> {
  await pool.query(
    `INSERT INTO point_events (id, user_id, type, points, timestamp)
     VALUES ($1, $2, $3, $4, NOW())`,
    [uuidv4(), targetId, 'vote', 2]
  );
  return 2;
}

export async function calculateKing(periodStart: Date): Promise<{ userId: string; points: number } | null> {
  const periodEnd = new Date(periodStart.getTime() + 20 * 60 * 1000);
  const { rows } = await pool.query(
    `SELECT user_id, SUM(points) as total_points
     FROM point_events
     WHERE timestamp >= $1 AND timestamp < $2
     GROUP BY user_id
     ORDER BY total_points DESC
     LIMIT 1`,
    [periodStart, periodEnd]
  );
  if (rows.length === 0) return null;
  return { userId: rows[0].user_id, points: Number(rows[0].total_points) };
}
