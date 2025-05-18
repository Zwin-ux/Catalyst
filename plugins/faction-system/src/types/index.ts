import { GuildMember, Role, TextChannel, CategoryChannel, PermissionResolvable, ChannelType } from 'discord.js';

export * from './faction';
export * from './config';

// Base plugin interface
export interface Plugin {
  name: string;
  description: string;
  version: string;
  config: any;
  commands: any[];
  initialize: (client: any, worldState: WorldState) => Promise<void>;
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  onInit?: () => Promise<void>;
  onReady?: () => Promise<void>;
  onDestroy?: () => Promise<void>;
  handleMessage?: (message: any) => Promise<void>;
  length?: number;
  [key: number]: any;
}

// Logger interface
export interface Logger {
  info: (message: string, ...meta: any[]) => void;
  error: (message: string, ...meta: any[]) => void;
  warn: (message: string, ...meta: any[]) => void;
  debug: (message: string, ...meta: any[]) => void;
}

// WorldState interface for database operations
export interface WorldState {
  // User operations
  getUser: (userId: string) => Promise<any>;
  saveUser: (user: any) => Promise<boolean>;
  updateUser: (userId: string, data: any) => Promise<boolean>;
  
  // Faction operations
  getFaction: (factionId: string) => Promise<any>;
  saveFaction: (faction: any) => Promise<boolean>;
  updateFaction: (factionId: string, data: any) => Promise<boolean>;
  deleteFaction: (factionId: string) => Promise<boolean>;
  getAllFactions: () => Promise<any[]>;
  
  // Drama event operations
  logDramaEvent: (event: any) => Promise<boolean>;
  getRecentDramaEvents: (limit?: number) => Promise<any[]>;
  
  // Additional operations
  updateDramaEvent: (eventId: string, data: any) => Promise<boolean>;
  
  // Add index signature for any additional methods
  [key: string]: any;
}
