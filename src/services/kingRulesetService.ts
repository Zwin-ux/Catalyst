import pool from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import { KingRuleset } from '../models/KingRuleset';

export async function createKingRuleset(ruleset: Omit<KingRuleset, 'id'>): Promise<KingRuleset> {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO king_rulesets (id, name, window_minutes, metric, reward_type, reward_value, announcement, eligible_role, min_participation)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, ruleset.name, ruleset.windowMinutes, ruleset.metric, ruleset.rewardType, ruleset.rewardValue, ruleset.announcement, ruleset.eligibleRole, ruleset.minParticipation]
  );
  return { id, ...ruleset };
}

export async function getKingRuleset(id: string): Promise<KingRuleset | null> {
  const { rows } = await pool.query(
    `SELECT * FROM king_rulesets WHERE id = $1`, [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    windowMinutes: r.window_minutes,
    metric: r.metric,
    rewardType: r.reward_type,
    rewardValue: r.reward_value,
    announcement: r.announcement,
    eligibleRole: r.eligible_role,
    minParticipation: r.min_participation,
  };
}

export async function listKingRulesets(): Promise<KingRuleset[]> {
  const { rows } = await pool.query(`SELECT * FROM king_rulesets`);
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    windowMinutes: r.window_minutes,
    metric: r.metric,
    rewardType: r.reward_type,
    rewardValue: r.reward_value,
    announcement: r.announcement,
    eligibleRole: r.eligible_role,
    minParticipation: r.min_participation,
  }));
}
