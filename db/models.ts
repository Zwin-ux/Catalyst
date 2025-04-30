// Database Models
// Defines the structure for Users, Factions, DramaEvents, etc.

export interface User {
  id: string;                  // Discord user ID
  username: string;            // Discord username
  dramaPoints: number;         // Points accumulated from drama
  karma: number;               // Positive/negative reputation
  factionId: string | null;    // ID of the faction they belong to
  roleHistory: string[];       // Special roles they've had 
  lastActive: string;          // ISO timestamp of last activity
  traits: string[];            // Special character traits
  badges: UserBadge[];         // Achievement badges
  created_at?: string;         // When the record was created
}

export interface UserBadge {
  id: string;                  // Badge identifier
  name: string;                // Display name
  description: string;         // What it means
  earnedAt: string;           // When it was earned
}

export interface Faction {
  id: string;                  // Unique identifier
  name: string;                // Display name
  description: string;         // Faction story/mission
  leaderIds: string[];         // Discord IDs of faction leaders
  memberIds: string[];         // All member Discord IDs
  power: number;               // Current power level
  entropy: number;             // Instability factor
  color: string;               // Hex color code for display
  emoji: string;               // Emoji representation
  rivalFactionIds: string[];   // Factions they're in conflict with
  allyFactionIds: string[];    // Factions they're allied with
  dramaWins: number;           // Number of drama events won
  created_at?: string;         // When the faction was created
}

export interface DramaEvent {
  id: string;                  // Unique identifier
  type: DramaEventType;        // Category of drama event
  participants: string[];      // Discord IDs of involved users 
  factions: string[];          // Faction IDs involved
  trigger: string;             // What caused this event
  description: string;         // Human-readable description
  score: number;               // Intensity/impact score
  outcome: string;             // What happened as a result
  resolved: boolean;           // Whether it's completed
  messageId?: string;          // Associated Discord message
  channelId?: string;          // Where it happened
  timestamp: string;           // When it occurred
  created_at?: string;         // Database timestamp
}

// Types of drama events
export enum DramaEventType {
  RIVALRY = 'rivalry',         // User vs user conflict
  FACTION_WAR = 'faction_war', // Faction vs faction
  BETRAYAL = 'betrayal',       // Internal faction conflict
  COUP = 'coup',               // Leadership challenge
  ALLIANCE = 'alliance',       // New cooperation formed
  RANDOM = 'random_event',     // System-generated event
}

// World state snapshot
export interface WorldState {
  users: Record<string, User>;     // All active users
  factions: Record<string, Faction>; // All factions
  events: DramaEvent[];            // Recent drama events
  lastUpdated: string;             // ISO timestamp
}
