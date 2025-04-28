export interface KingRuleset {
  id: string;
  name: string;
  windowMinutes: number;
  metric: 'points' | 'aura' | 'voiceTime' | 'votes' | string; // custom
  rewardType: 'role' | 'points' | 'custom';
  rewardValue: string; // role name, points, or custom logic reference
  announcement: string; // e.g., '{user} is crowned King with {points}!'
  eligibleRole?: string;
  minParticipation?: number;
}
