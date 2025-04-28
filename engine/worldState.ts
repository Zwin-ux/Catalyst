// WorldStateManager: Central persistent state for the Catalyst world
import { GuildMember } from 'discord.js';

export interface WorldUser {
  id: string;
  name: string;
  xp: number;
  dramaPoints: number;
  badges: string[];
  factionId?: string;
}

export interface Faction {
  id: string;
  name: string;
  members: string[];
  dramaScore: number;
  level: number;
}

export interface DramaEvent {
  id: string;
  type: string;
  timestamp: number;
  participants: string[];
  description: string;
  impact: number;
}

export interface WorldState {
  users: Record<string, WorldUser>;
  factions: Record<string, Faction>;
  dramaTimeline: DramaEvent[];
  season: number;
  lastEvent: number;
}

export class WorldStateManager {
  private state: WorldState;
  constructor(initial?: Partial<WorldState>) {
    this.state = {
      users: {},
      factions: {},
      dramaTimeline: [],
      season: 1,
      lastEvent: Date.now(),
      ...initial
    };
  }
  getState() { return this.state; }
  updateUser(id: string, data: Partial<WorldUser>) {
    this.state.users[id] = { ...this.state.users[id], ...data };
  }
  addDramaEvent(event: DramaEvent) {
    this.state.dramaTimeline.push(event);
    this.state.lastEvent = event.timestamp;
  }
  // ...more methods for factions, badges, etc.
  // TODO: Add persistence (DB or file)
}
