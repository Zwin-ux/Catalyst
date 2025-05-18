import { Collection } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { User, Faction, DramaEvent } from '../db/models';
import { db } from '../db';
import { Logger } from '../src/utils/logger';
import { WorldState } from './types/worldState';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * WorldStateManager handles the persistent state of the world,
 * including users, factions, and events.
 */

export class WorldStateManager implements WorldState {
  private readonly users = new Collection<string, User>();
  private readonly factions = new Collection<string, Faction>();
  private readonly events = new Collection<string, DramaEvent>();
  private readonly cache = new Map<string, CacheEntry<any>>();
  private ready = false;
  private saveInterval: NodeJS.Timeout;
  private logger: Logger;
  
  /**
   * Get a cached value or undefined if not found or expired
   */
  private getFromCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data as T;
  }
  
  /**
   * Set a value in the cache
   */
  private setCache<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('WorldState');
    
    // Auto-save every 5 minutes
    this.saveInterval = setInterval(() => {
      this.saveState().catch(error => {
        this.logger.error('Error during auto-save:', error);
      });
    }, 5 * 60 * 1000);
    
    // Initialize the world state
    this.initialize().catch(error => {
      this.logger.error('Failed to initialize world state:', error);
    });
  }

  private async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing world state...');
      await this.loadState();
      this.ready = true;
      this.logger.info('World state initialized');
    } catch (error) {
      this.logger.error('Failed to initialize world state:', error);
      // Don't crash, we can continue with empty collections
    }
  }

  private async loadState(): Promise<void> {
    try {
      this.logger.debug('Loading world state from database...');
      
      // Load recent events
      const recentEvents = await db.getRecentDramaEvents(100);
      this.events.clear();
      recentEvents.forEach(event => this.events.set(event.id, event));
      
      // Load all factions
      // In a production environment, you'd want pagination here
      const factionIds = new Set<string>();
      for (const event of recentEvents) {
        event.factions?.forEach(id => factionIds.add(id));
      }
      
      const factions = await Promise.all(
        Array.from(factionIds).map(id => db.getFaction(id))
      );
      
      this.factions.clear();
      for (const faction of factions) {
        if (faction) {
          this.factions.set(faction.id, faction);
          // Cache the faction
          this.setCache(`faction:${faction.id}`, faction);
        }
      }
      
      // Load users from factions
      const userIds = new Set<string>();
      for (const faction of this.factions.values()) {
        faction.memberIds?.forEach(id => userIds.add(id));
      }
      
      const users = await Promise.all(
        Array.from(userIds).map(id => db.getUser(id))
      );
      
      this.users.clear();
      for (const user of users) {
        if (user) {
          this.users.set(user.id, user);
          // Cache the user
          this.setCache(`user:${user.id}`, user);
        }
      }
      
      this.logger.info(`Loaded ${this.users.size} users, ${this.factions.size} factions, ${this.events.size} events`);
    } catch (error) {
      this.logger.error('Error loading world state:', error);
      // Clear collections on error to prevent partial state
      this.users.clear();
      this.factions.clear();
      this.events.clear();
      throw error; // Re-throw to allow retry logic if needed
    }
  }

  private async saveState(): Promise<void> {
    if (!this.ready) {
      this.logger.warn('Attempted to save world state before initialization');
      return;
    }
    
    const startTime = Date.now();
    this.logger.debug('Saving world state...');
    
    try {
      // Save all users
      await Promise.all(
        Array.from(this.users.values()).map(user => {
          const { id, ...userData } = user;
          return db.updateUser(id, userData).catch(error => {
            this.logger.error(`Failed to save user ${id}:`, error);
            throw error;
          });
        })
      );
      
      // Save all factions
      await Promise.all(
        Array.from(this.factions.values()).map(faction => {
          const { id, ...factionData } = faction;
          return db.updateFaction(id, factionData).catch(error => {
            this.logger.error(`Failed to save faction ${id}:`, error);
            throw error;
          });
        })
      );
      
      // Save all events
      await Promise.all(
        Array.from(this.events.values()).map(event => 
          db.updateDramaEvent(event).catch(error => {
            this.logger.error(`Failed to save event ${event.id}:`, error);
            throw error;
          })
        )
      );
      
      const duration = Date.now() - startTime;
      this.logger.info(`World state saved successfully in ${duration}ms`);
    } catch (error) {
      this.logger.error('Error saving world state:', error);
      throw error; // Re-throw to allow retry logic if needed
    }
  }

  // User management
  /**
   * Get a user by ID, loading from cache or database if not in memory
   */
  async getUser(userId: string): Promise<User | null> {
    // Check in-memory cache first
    let user = this.users.get(userId);
    if (user) return user;
    
    // Check cache
    const cacheKey = `user:${userId}`;
    const cachedUser = this.getFromCache<User>(cacheKey);
    if (cachedUser) {
      this.users.set(userId, cachedUser);
      return cachedUser;
    }
    
    // Load from database
    try {
      const dbUser = await db.getUser(userId);
      if (dbUser) {
        this.users.set(userId, dbUser);
        this.setCache(cacheKey, dbUser);
        return dbUser;
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get user ${userId}:`, error);
      throw error;
    }
  }

  async getOrCreateUser(userId: string, username: string): Promise<User> {
    let user = await this.getUser(userId);
    
    if (!user) {
      user = {
        id: userId,
        username,
        dramaPoints: 0,
        karma: 0,
        factionId: null,
        roleHistory: [],
        lastActive: new Date().toISOString(),
        traits: [],
        badges: []
      };
      
      await db.saveUser(user);
      this.users.set(userId, user);
    }
    
    return user;
  }

  async saveUser(user: User): Promise<boolean> {
    try {
      const success = await db.saveUser(user);
      if (success) {
        this.users.set(user.id, user);
        this.setCache(`user:${user.id}`, user);
      }
      return success;
    } catch (error) {
      this.logger.error(`Failed to save user ${user.id}:`, error);
      return false;
    }
  }

  async updateUser(user: User): Promise<void> {
    user.lastActive = new Date().toISOString();
    await db.saveUser(user);
    this.users.set(user.id, user);
  }

  // Faction management
  /**
   * Get a faction by ID, loading from cache or database if not in memory
   */
  async getFaction(factionId: string): Promise<Faction | null> {
    // Check in-memory cache first
    const cachedFaction = this.factions.get(factionId);
    if (cachedFaction) return cachedFaction;
    
    // Check cache
    const cacheKey = `faction:${factionId}`;
    const cachedFactionFromStore = this.getFromCache<Faction>(cacheKey);
    if (cachedFactionFromStore) {
      this.factions.set(factionId, cachedFactionFromStore);
      return cachedFactionFromStore;
    }
    
    // Load from database
    try {
      const dbFaction = await db.getFaction(factionId);
      if (dbFaction) {
        this.factions.set(factionId, dbFaction);
        this.setCache(cacheKey, dbFaction);
        return dbFaction;
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get faction ${factionId}:`, error);
      throw error;
    }
  }

  async createFaction(name: string, creatorId: string, description: string = ''): Promise<Faction> {
    const id = `faction_${uuidv4()}`;
    const now = new Date().toISOString();
    
    const faction: Faction = {
      id,
      name,
      description,
      leaderIds: [creatorId],
      memberIds: [creatorId],
      power: 100,
      entropy: 0,
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      emoji: '🎭',
      rivalFactionIds: [],
      allyFactionIds: [],
      dramaWins: 0,
      created_at: now
    };
    
    await db.saveFaction(faction);
    this.factions.set(id, faction);
    
    // Update creator's faction
    const creator = await this.getOrCreateUser(creatorId, 'Unknown User');
    creator.factionId = id;
    await this.updateUser(creator);
    
    return faction;
  }

  // Event management
  async saveFaction(faction: Faction): Promise<boolean> {
    try {
      await db.saveFaction(faction);
      this.factions.set(faction.id, faction);
      return true;
    } catch (error) {
      this.logger.error(`Failed to save faction ${faction.id}:`, error);
      return false;
    }
  }

  async updateFaction(factionId: string, data: Partial<Faction>): Promise<boolean> {
    try {
      const faction = await this.getFaction(factionId);
      if (!faction) return false;
      
      const updatedFaction = { ...faction, ...data };
      const success = await db.updateFaction(factionId, data);
      if (success) {
        this.factions.set(factionId, updatedFaction);
        this.setCache(`faction:${factionId}`, updatedFaction);
      }
      return success;
    } catch (error) {
      this.logger.error(`Failed to update faction ${factionId}:`, error);
      return false;
    }
  }

  async deleteFaction(factionId: string): Promise<boolean> {
    try {
      await db.deleteFaction(factionId);
      this.factions.delete(factionId);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete faction ${factionId}:`, error);
      return false;
    }
  }

  async getAllFactions(): Promise<Faction[]> {
    try {
      // In a real implementation, you might want to implement pagination here
      return Array.from(this.factions.values());
    } catch (error) {
      this.logger.error('Failed to get all factions:', error);
      return [];
    }
  }

  async logDramaEvent(event: Omit<DramaEvent, 'id' | 'timestamp'>): Promise<DramaEvent> {
    const timestamp = new Date();
    const newEvent: DramaEvent = {
      ...event,
      id: `event_${uuidv4()}`,
      timestamp: timestamp,
      resolved: false,
      created_at: timestamp.toISOString()
    };
    
    await db.logDramaEvent(newEvent);
    this.events.set(newEvent.id, newEvent);
    
    // Update last event for participants
    for (const userId of newEvent.participants) {
      const user = await this.getUser(userId);
      if (user) {
        user.lastActive = timestamp.toISOString();
        await this.updateUser(user);
      }
    }
    
    // Update last event for factions
    for (const factionId of newEvent.factions) {
      const faction = await this.getFaction(factionId);
      if (faction) {
        // In a real implementation, you might want to update faction state here
        await db.saveFaction(faction);
      }
    }
    
    return newEvent;
  }

  async getRecentDramaEvents(limit: number = 100): Promise<DramaEvent[]> {
    try {
      const events = await db.getRecentDramaEvents(limit);
      // Update in-memory cache
      events.forEach(event => this.events.set(event.id, event));
      return events;
    } catch (error) {
      this.logger.error('Failed to get recent drama events:', error);
      return [];
    }
  }

  async updateDramaEvent(eventId: string, data: Partial<DramaEvent>): Promise<boolean> {
    try {
      const event = this.events.get(eventId);
      if (!event) return false;
      
      const updatedEvent = { ...event, ...data };
      const success = await db.updateDramaEvent(updatedEvent);
      if (success) {
        this.events.set(eventId, updatedEvent);
      }
      return success;
    } catch (error) {
      this.logger.error(`Failed to update drama event ${eventId}:`, error);
      return false;
    }
  }

  async destroy(): Promise<void> {
    this.logger.info('Shutting down world state manager...');
    clearInterval(this.saveInterval);
    
    try {
      await this.saveState();
      this.logger.info('World state manager shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      throw error;
    } finally {
      // Clear all caches
      this.users.clear();
      this.factions.clear();
      this.events.clear();
      this.cache.clear();
    }
  }
}

// Export a singleton instance
export const worldState = new WorldStateManager();

// Cleanup on process exit
process.on('SIGINT', async () => {
  await worldState.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await worldState.destroy();
  process.exit(0);
});
