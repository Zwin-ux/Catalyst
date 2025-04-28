import pool from '../src/utils/db';
import { v4 as uuidv4 } from 'uuid';

export async function logDramaAlliance(userA: string, userB: string, type: 'alliance' | 'rivalry', score: number) {
  // Upsert drama_alliances
  const id = uuidv4();
  await pool.query(`INSERT INTO drama_alliances (id, user_a, user_b, type, drama_score, last_interaction)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_a, user_b, type) DO UPDATE SET drama_score = drama_alliances.drama_score + $5, last_interaction = NOW()`,
    [id, userA, userB, type, score]);
}

export async function logDramaEvent(eventType: string, userA: string, userB: string | null, factionA: string | null, factionB: string | null, score: number, details: object) {
  const id = uuidv4();
  await pool.query(`INSERT INTO drama_events (id, event_type, user_a, user_b, faction_a, faction_b, score, event_time, details)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
    [id, eventType, userA, userB, factionA, factionB, score, JSON.stringify(details)]);
}
