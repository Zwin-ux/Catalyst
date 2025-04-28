import pool from '../utils/db';

export async function getLeaderboard(period: string = 'day'): Promise<{ userId: string; displayName: string; points: number }[]> {
  let interval = '1 day';
  if (period === 'week') interval = '7 days';
  const { rows } = await pool.query(
    `SELECT u.id as user_id, u.display_name, SUM(pe.points) as points
     FROM point_events pe
     JOIN users u ON pe.user_id = u.id
     WHERE pe.timestamp >= NOW() - INTERVAL '${interval}'
     GROUP BY u.id, u.display_name
     ORDER BY points DESC
     LIMIT 10`
  );
  return rows.map(r => ({ userId: r.user_id, displayName: r.display_name, points: Number(r.points) }));
}

export async function getUserStats(userId: string): Promise<{ total: number; voiceTime: number; votes: number; kingWins: number }> {
  // Total points
  const { rows: totalRows } = await pool.query(
    `SELECT COALESCE(SUM(points),0) as total FROM point_events WHERE user_id = $1`, [userId]
  );
  // VoiceTime points
  const { rows: voiceRows } = await pool.query(
    `SELECT COALESCE(SUM(points),0) as total FROM point_events WHERE user_id = $1 AND type = 'voiceTime'`, [userId]
  );
  // Votes
  const { rows: voteRows } = await pool.query(
    `SELECT COALESCE(SUM(points),0) as total FROM point_events WHERE user_id = $1 AND type = 'vote'`, [userId]
  );
  // King wins
  const { rows: kingRows } = await pool.query(
    `SELECT COUNT(*) as total FROM king_of_hill WHERE user_id = $1`, [userId]
  );
  return {
    total: Number(totalRows[0].total),
    voiceTime: Number(voiceRows[0].total),
    votes: Number(voteRows[0].total),
    kingWins: Number(kingRows[0].total)
  };
}
