export type GuildInstallState = 'draft' | 'ready';
export type SeasonStatus = 'draft' | 'active' | 'completed';
export type ConsentStatus = 'granted' | 'withdrawn';
export type SeasonEventType =
  | 'guild_configured'
  | 'season_started'
  | 'season_announced'
  | 'member_joined'
  | 'member_opted_out'
  | 'season_completed';

export interface CrewState {
  id: string;
  name: string;
  color: number;
  accentHex: string;
  description: string;
  memberIds: string[];
  points: number;
}

export interface GuildInstallation {
  guildId: string;
  guildName: string;
  installState: GuildInstallState;
  announceChannelId?: string;
  consentCopy: string;
  quietHours: string;
  theme: string;
  createdAt: string;
  updatedAt: string;
}

export interface Season {
  id: string;
  guildId: string;
  name: string;
  week: number;
  status: SeasonStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  joinMessageId?: string;
  crews: CrewState[];
}

export interface SeasonMembership {
  id: string;
  guildId: string;
  seasonId: string;
  userId: string;
  displayName: string;
  crewId: string;
  consentedAt: string;
  optedOutAt?: string;
  score: number;
  streak: number;
}

export interface ConsentRecord {
  id: string;
  guildId: string;
  seasonId: string;
  userId: string;
  status: ConsentStatus;
  copy: string;
  updatedAt: string;
}

export interface SeasonEvent {
  id: string;
  guildId: string;
  seasonId: string;
  type: SeasonEventType;
  actorId?: string;
  crewId?: string;
  summary: string;
  createdAt: string;
}

export interface SeasonSummary {
  id: string;
  guildId: string;
  seasonId: string;
  headline: string;
  body: string;
  createdAt: string;
}

export interface CatalystState {
  guildInstallations: Record<string, GuildInstallation>;
  seasons: Record<string, Season>;
  memberships: Record<string, SeasonMembership>;
  consentRecords: Record<string, ConsentRecord>;
  events: Record<string, SeasonEvent>;
  summaries: Record<string, SeasonSummary>;
}

export interface SetupInput {
  guildId: string;
  guildName: string;
  announceChannelId?: string;
  consentCopy?: string;
  quietHours?: string;
  theme?: string;
}

export interface JoinSeasonResult {
  membership: SeasonMembership;
  crew: CrewState;
  season: Season;
  joinedNow: boolean;
}

export interface LeaderboardEntry {
  crewId: string;
  crewName: string;
  points: number;
  memberCount: number;
}

export interface MemberProfile {
  membership: SeasonMembership;
  season: Season;
  crew: CrewState;
}

export interface GuildOverview {
  installation: GuildInstallation;
  activeSeason: Season | null;
  activeMembers: number;
}
