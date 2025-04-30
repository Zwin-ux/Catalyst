/**
 * Faction & Reputation System
 * 
 * Handles faction formation, creative plot twists, reputation, and playful power.
 * Allows factions to rise, fall, ally, switch sides, and evolve through showdowns and aura-offs.
 */

import { Client, Guild, GuildMember, Role, TextChannel, VoiceChannel, ColorResolvable, Message } from 'discord.js';
import { eventCapture } from './eventCapture';
import { User, Faction, DramaEvent } from '../types';

export interface FactionAllianceData {
  id: string;
  factionIdA: string;
  factionIdB: string;
  strength: number;  // 0-100
  created: Date;
  lastInteraction: Date;
  auraScore: number; // -10 to 10, negative means playful rivalry, positive means hype
}

export interface FactionCreateOptions {
  name: string;
  description: string;
  emoji?: string;
  color?: ColorResolvable;
  founderUserId: string;
}

export class FactionSystem {
  private factions: Map<string, Faction> = new Map();
  private userFactions: Map<string, string> = new Map(); // userId -> factionId
  private alliances: FactionAllianceData[] = [];
  // Showdowns and spotlight challenges are tracked here
  
  constructor() {
    // Subscribe to message events
    eventCapture.on('message', (msg: Message) => {
      this.onMessage(msg).catch(console.error);
    });
  }

  /**
   * Handle Discord messages for faction-related triggers
   */
  async onMessage(message: Message): Promise<void> {
    // Detect creative callouts or plot twist keywords
    if (message.author.bot) return;
    // You can expand this logic to trigger showdowns, aura-offs, or spotlight challenges.
    // For now, just log for demonstration
    if (message.content.toLowerCase().includes('plot twist') || message.content.toLowerCase().includes('showdown') || message.content.toLowerCase().includes('aura-off')) {
      console.log(`[FactionSystem] Possible creative event detected by ${message.author.username}`);
      // TODO: Trigger playful event, update hype, etc.
    }
  }
  
  /**
   * Create a new faction
   * @param options Faction creation options
   * @returns The newly created faction
   */
  async createFaction(options: FactionCreateOptions): Promise<Faction> {
    const faction: Faction = {
      id: `faction-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: options.name,
      description: options.description,
      emoji: options.emoji,
      power: 10, // Starting power
      entropy: 0,
      dramaWins: 0,
      memberCount: 1,
      createdAt: new Date(),
      founderUserId: options.founderUserId
    };
    
    this.factions.set(faction.id, faction);
    this.userFactions.set(options.founderUserId, faction.id);
    
    // Create faction role and channels in Discord
    await this.createFactionRole(faction);
    await this.createFactionChannels(faction);
    
    return faction;
  }
  
  /**
   * Join an existing faction
   * @param userId Discord user ID joining the faction
   * @param factionId Faction ID to join
   * @returns Success status
   */
  async joinFaction(userId: string, factionId: string): Promise<boolean> {
    if (!this.factions.has(factionId)) return false;
    
    // If user is already in a faction, leave it first
    const currentFactionId = this.userFactions.get(userId);
    if (currentFactionId) {
      await this.leaveFaction(userId);
    }
    
    // Join the new faction
    this.userFactions.set(userId, factionId);
    
    // Update faction member count
    const faction = this.factions.get(factionId)!;
    faction.memberCount = (faction.memberCount || 0) + 1;
    this.factions.set(factionId, faction);
    
    // Add user to faction role in Discord
    await this.assignFactionRole(userId, faction);
    
    return true;
  }
  
  /**
   * Leave a faction
   * @param userId Discord user ID leaving the faction
   * @returns Success status
   */
  async leaveFaction(userId: string): Promise<boolean> {
    const factionId = this.userFactions.get(userId);
    if (!factionId) return false;
    
    // Remove user from faction
    this.userFactions.delete(userId);
    
    // Update faction member count
    const faction = this.factions.get(factionId)!;
    faction.memberCount = Math.max(0, (faction.memberCount || 1) - 1);
    this.factions.set(factionId, faction);
    
    // If faction is now empty, consider dissolving it
    if (faction.memberCount <= 0) {
      this.dissolveFaction(factionId);
    }
    
    // Remove faction role from user in Discord
    await this.removeFactionRole(userId, faction);
    
    return true;
  }
  
  /**
   * Dissolve a faction entirely
   * @param factionId Faction ID to dissolve
   */
  async dissolveFaction(factionId: string): Promise<void> {
    if (!this.factions.has(factionId)) return;
    
    // Get all members of this faction and remove them
    for (const [userId, userFactionId] of this.userFactions.entries()) {
      if (userFactionId === factionId) {
        this.userFactions.delete(userId);
        // Remove faction role from user in Discord
        await this.removeFactionRole(userId, this.factions.get(factionId)!);
      }
    }
    
    // Remove faction channels in Discord
    await this.removeFactionChannels(this.factions.get(factionId)!);
    
    // Remove faction role in Discord (passing null means remove the role completely)
    await this.removeFactionRole(null, this.factions.get(factionId)!);
    
    // Remove faction from memory
    this.factions.delete(factionId);
    
    // Dissolve any alliances involving this faction
    this.alliances = this.alliances.filter(a => 
      a.factionIdA !== factionId && a.factionIdB !== factionId);
  }
  
  /**
   * Create an alliance between two factions
   * @param factionIdA First faction ID
   * @param factionIdB Second faction ID
   * @returns The alliance data if successful
   */
  async createAlliance(factionIdA: string, factionIdB: string): Promise<FactionAllianceData | null> {
    if (!this.factions.has(factionIdA) || !this.factions.has(factionIdB)) return null;
    if (factionIdA === factionIdB) return null;
    
    // Check if alliance already exists
    const existingAlliance = this.alliances.find(a => 
      (a.factionIdA === factionIdA && a.factionIdB === factionIdB) || 
      (a.factionIdA === factionIdB && a.factionIdB === factionIdA));
    
    if (existingAlliance) return existingAlliance;
    
    // Create new alliance
    const alliance: FactionAllianceData = {
      id: `alliance-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      factionIdA,
      factionIdB,
      strength: 50, // Start at neutral
      created: new Date(),
      lastInteraction: new Date(),
      auraScore: 0, // Start neutral
    };
    
    this.alliances.push(alliance);
    return alliance;
  }
  
  /**
   * Update an alliance's aura score (positive = hype, negative = playful rivalry)
   * @param allianceId Alliance ID
   * @param auraDelta Change in aura score
   */
  async updateAllianceAura(allianceId: string, auraDelta: number): Promise<void> {
    const alliance = this.alliances.find(a => a.id === allianceId);
    if (!alliance) return;
    
    alliance.auraScore = Math.max(-10, Math.min(10, (alliance.auraScore || 0) + auraDelta));
    alliance.lastInteraction = new Date();
    
    // If aura is very negative, consider triggering a plot twist (switch sides)
    if (alliance.auraScore <= -8 && Math.random() < 0.5) {
      await this.triggerPlotTwist(alliance);
    }
  }
  
  /**
   * Trigger a plot twist event (switch sides, creative rivalry) between allied factions
   * @param alliance Alliance data
   */
  async triggerPlotTwist(alliance: FactionAllianceData): Promise<void> {
    // Remove the alliance
    this.alliances = this.alliances.filter(a => a.id !== alliance.id);
    
    // Create playful event
    const plotTwistEvent: DramaEvent = {
      id: `plot-twist-${Date.now()}`,
      participants: [alliance.factionIdA, alliance.factionIdB],
      trigger: 'faction_plot_twist',
      score: 8, // Plot twists are high hype
      outcome: `Alliance between ${this.factions.get(alliance.factionIdA)?.name} and ${this.factions.get(alliance.factionIdB)?.name} has ended in a creative plot twist!`
    };
    // TODO: Publish plot twist event to timeline
  }
  
  /**
   * Auto-suggest faction for a user based on their interactions
   * @param userId User to suggest faction for
   * @returns Suggested faction ID if any
   */
  async suggestFaction(userId: string): Promise<string | null> {
    // If user is already in a faction, don't suggest
    if (this.userFactions.has(userId)) return null;
    
    // TODO: Implement real logic based on user interactions
    // For now, return a random faction if any exist
    const factionIds = Array.from(this.factions.keys());
    if (factionIds.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * factionIds.length);
    return factionIds[randomIndex];
  }
  
  /**
   * Get a user's current faction
   * @param userId User ID
   * @returns Faction or null
   */
  getUserFaction(userId: string): Faction | null {
    const factionId = this.userFactions.get(userId);
    if (!factionId) return null;
    return this.factions.get(factionId) || null;
  }
  
  /**
   * Get all factions
   * @returns Array of all factions
   */
  getAllFactions(): Faction[] {
    return Array.from(this.factions.values());
  }
  
  /**
   * Get members of a faction
   * @param factionId Faction ID
   * @returns Array of user IDs
   */
  getFactionMembers(factionId: string): string[] {
    return Array.from(this.userFactions.entries())
      .filter(([_, userFactionId]) => userFactionId === factionId)
      .map(([userId, _]) => userId);
  }
  
  /**
   * Calculate a faction's power based on members and events
   * @param factionId Faction ID
   * @returns Updated power level
   */
  async calculateFactionPower(factionId: string): Promise<number> {
    if (!this.factions.has(factionId)) return 0;
    
    const faction = this.factions.get(factionId)!;
    
    // Base power from member count
    let power = faction.memberCount * 5;
    
    // Add power from drama wins
    power += faction.dramaWins * 10;
    
    // Add power from alliances
    const alliances = this.alliances.filter(a => 
      (a.factionIdA === factionId || a.factionIdB === factionId) && 
      a.dramaScore > 0);
    
    power += alliances.length * 8;
    
    // Cap power
    power = Math.max(1, Math.min(100, power));
    
    // Update faction
    faction.power = power;
    this.factions.set(factionId, faction);
    
    return power;
  }
  
  // Private helper methods for Discord integration
  
  private async createFactionRole(faction: Faction, guild?: Guild): Promise<void> {
    // Would integrate with Discord
    // Create role with faction color and name
  }
  
  private async assignFactionRole(userId: string, faction: Faction): Promise<void> {
    // Would integrate with Discord
    // Give role to member
  }
  
  /**
   * Remove faction role from a user
   * @param userId User ID to remove role from (optional)
   * @param faction Faction data
   * @param guild Optional guild object
   */
  private async removeFactionRole(userId: string | null, faction: Faction, guild?: Guild): Promise<void> {
    // Would integrate with Discord
    // Remove role from member or delete role completely if userId is null
    if (userId === null) {
      // Delete faction role completely (no specific user)
      console.log(`Would remove faction role for ${faction.name} completely`);
    } else {
      // Remove role from specific user
      console.log(`Would remove faction role for ${faction.name} from user ${userId}`);
    }
  }
  
  private async createFactionChannels(faction: Faction): Promise<void> {
    // Would integrate with Discord
    // Create text and voice channels for faction
  }
  
  private async removeFactionChannels(faction: Faction): Promise<void> {
    // Would integrate with Discord
    // Remove faction channels
  }
}

export default new FactionSystem();
