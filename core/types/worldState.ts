import { User, Faction, DramaEvent } from '../../db/models';

export interface WorldState {
  // User operations
  getUser(userId: string): Promise<User | null>;
  getOrCreateUser(userId: string, username: string): Promise<User>;
  updateUser(user: User): Promise<void>;
  saveUser(user: User): Promise<boolean>;
  
  // Faction operations
  getFaction(factionId: string): Promise<Faction | null>;
  createFaction(name: string, creatorId: string, description?: string): Promise<Faction>;
  saveFaction(faction: Faction): Promise<boolean>;
  updateFaction(factionId: string, data: Partial<Faction>): Promise<boolean>;
  deleteFaction(factionId: string): Promise<boolean>;
  getAllFactions(): Promise<Faction[]>;
  
  // Event operations
  logDramaEvent(event: Omit<DramaEvent, 'id' | 'timestamp'>): Promise<DramaEvent>;
  getRecentDramaEvents(limit?: number): Promise<DramaEvent[]>;
  
  // Additional operations
  updateDramaEvent(eventId: string, data: Partial<DramaEvent>): Promise<boolean>;
  
  // Cleanup
  destroy(): Promise<void>;
  
  // Index signature for any additional methods
  [key: string]: any;
}
