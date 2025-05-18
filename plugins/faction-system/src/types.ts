import { GuildMember, Role, TextChannel } from 'discord.js';

export type FactionRole = 'leader' | 'officer' | 'member' | 'recruit';

export type FactionRoleType = 'leader' | 'officer' | 'member';

export interface FactionMember {
  id: string;
  userId: string;
  role: FactionRoleType;
  joinedAt: Date;
  lastActive: Date;
  nickname?: string;
  title?: string;
  rank?: number;
  permissions?: string[];
  isActive?: boolean;
  status?: 'active' | 'inactive' | 'banned' | 'muted' | 'kicked' | 'left';
  lastOnline?: Date;
  timeInFaction?: number;
  contribution?: number;
  xp?: number;
  level?: number;
  achievements?: string[];
  notes?: string;
  flags?: string[];
  metadata?: Record<string, any>;
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  leaderIds: string[];
  memberIds: string[];
  members: FactionMember[];
  power: number;
  isActive: boolean;
  color?: number;
  powerDecayThreshold?: number;
  powerDecayMinimum?: number;
  powerDecayMaximum?: number;
  powerDecayEnabled?: boolean;
  icon?: string;
  banner?: string;
  channelId?: string;
  roleId?: string;
  categoryId?: string;
}

export interface FactionSystemConfig {
  enabled: boolean;
  cooldowns: {
    createFaction: number;
    renameFaction: number;
    changeDescription: number;
    inviteMember: number;
    kickMember: number;
    promoteMember: number;
    demoteMember: number;
    leaveFaction: number;
    disbandFaction: number;
    creationCooldown: number;
  };
  maxFactionNameLength: number;
  maxFactionDescriptionLength: number;
  defaultFactionPower: number;
  maxFactionsPerUser: number;
  maxMembersPerFaction: number;
  startingPower: number;
  powerDecayRate: number;
  powerDecayInterval: number;
  powerDecayThreshold: number;
  powerDecayMinimum: number;
  powerDecayMaximum: number;
  powerDecayEnabled: boolean;
  enableFactionChannels: boolean;
  enableFactionRoles: boolean;
  logger: Console;
  factionCategoryId?: string;
}
