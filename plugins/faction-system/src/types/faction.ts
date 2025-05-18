import { GuildMember, Role, TextChannel, CategoryChannel, PermissionResolvable, ChannelType } from 'discord.js';

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
  icon?: string;
  banner?: string;
  channelId?: string;
  roleId?: string;
  categoryId?: string;
  powerDecayThreshold?: number;
  powerDecayMinimum?: number;
  powerDecayMaximum?: number;
  powerDecayEnabled?: boolean;
}
