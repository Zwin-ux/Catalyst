/**
 * Shared Types & Enums for Catalyst Drama Engine
 */

/**
 * Drama Event Types categorize different kinds of events that can trigger drama
 */
export enum DramaEventType {
  MESSAGE = 'MESSAGE',      // Chat messages
  REACTION = 'REACTION',    // Emoji reactions
  VOICE = 'VOICE',          // Voice channel activity
  BETRAYAL = 'BETRAYAL',    // Faction betrayals
  ALLIANCE = 'ALLIANCE',    // Faction alliances
  WAR = 'WAR',              // Faction wars
  COUP = 'COUP',            // Leadership coups
  VOTE = 'VOTE',            // Dramatic votes
  SCANDAL = 'SCANDAL',      // User scandals
}

/**
 * User interface represents a Discord user in the drama system
 */
export interface User {
  id: string;              // Discord user ID
  name?: string;           // Display name
  karma: number;           // Reputation/karma points
  dramaScore: number;      // Drama involvement score
  factionId?: string;      // Current faction ID (if any)
  roleHistory: string[];   // History of roles/positions
  instigatorIndex?: number; // 0-1 score of how often they start drama
  badges?: string[];       // Achievement badges
  joinedAt?: Date;         // When they joined the system
  lastActive?: Date;       // Last activity timestamp
}

/**
 * Faction interface represents a group/team/alliance in the drama system
 */
export interface Faction {
  id: string;              // Unique faction ID
  name: string;            // Display name
  description?: string;    // Faction description
  emoji?: string;          // Emoji representation
  power: number;           // 0-100 power score
  entropy: number;         // How unstable the faction is (0-1)
  dramaWins: number;       // Victories in drama events
  memberCount: number;     // Number of members
  createdAt: Date;         // Creation timestamp
  founderUserId: string;   // User who created the faction
  color?: number | string; // Color representation for UI
}

/**
 * DramaEvent represents a significant social event tracked by the system
 */
export interface DramaEvent {
  id: string;              // Unique event ID
  type?: DramaEventType;   // Category of event
  participants: string[];  // User IDs involved
  trigger: string;         // What caused this event
  score: number;           // Drama intensity (0-10)
  outcome: string;         // Description of what happened
  timestamp?: number;      // When it happened
  factionsInvolved?: string[]; // Faction IDs involved
  location?: string;       // Channel/place where it happened
}

/**
 * Plugin configuration for the modular plugin system
 */
export interface PluginConfig {
  id: string;              // Unique plugin ID
  name: string;            // Display name
  description: string;     // What this plugin does
  enabled: boolean;        // Whether it's active
  requiredPermissions?: string[]; // Discord permissions needed
  settings?: Record<string, any>; // Plugin-specific settings
  dependencies?: string[]; // Other plugins this depends on
}
