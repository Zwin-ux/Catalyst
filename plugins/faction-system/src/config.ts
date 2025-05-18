/**
 * Default configuration for the Faction System plugin
 */
export interface FactionSystemConfig {
  /** Whether the faction system is enabled */
  enabled: boolean;
  
  /** Default starting power for new factions */
  defaultFactionPower: number;
  
  /** Maximum number of factions a user can be a member of */
  maxFactionsPerUser: number;
  
  /** Minimum length for faction names */
  minFactionNameLength: number;
  
  /** Maximum length for faction names */
  maxFactionNameLength: number;
  
  /** Minimum length for faction descriptions */
  minDescriptionLength: number;
  
  /** Maximum length for faction descriptions */
  maxDescriptionLength: number;
  
  /** Cooldown between faction creation attempts (in milliseconds) */
  creationCooldown: number;
  
  /** Whether to enable faction chat channels */
  enableFactionChannels: boolean;
  
  /** Prefix for faction channels */
  factionChannelPrefix: string;
  
  /** Category ID for faction channels */
  factionCategoryId?: string;
  
  /** Role ID for faction leaders */
  leaderRoleId?: string;
  
  /** Role ID for faction members */
  memberRoleId?: string;
}

/**
 * Default configuration values
 */
export const defaultConfig: FactionSystemConfig = {
  enabled: true,
  defaultFactionPower: 100,
  maxFactionsPerUser: 3,
  minFactionNameLength: 3,
  maxFactionNameLength: 32,
  minDescriptionLength: 10,
  maxDescriptionLength: 1000,
  creationCooldown: 24 * 60 * 60 * 1000, // 24 hours
  enableFactionChannels: true,
  factionChannelPrefix: 'faction-',
  factionCategoryId: undefined,
  leaderRoleId: undefined,
  memberRoleId: undefined
};

/**
 * Validates the plugin configuration
 * @param config The configuration to validate
 * @returns Validation result with success status and optional error message
 */
export function validateConfig(config: Partial<FactionSystemConfig>): { valid: boolean; error?: string } {
  if (config.enabled === undefined) {
    return { valid: false, error: 'enabled is required' };
  }
  
  if (config.defaultFactionPower !== undefined && config.defaultFactionPower < 0) {
    return { valid: false, error: 'defaultFactionPower must be non-negative' };
  }
  
  if (config.maxFactionsPerUser !== undefined && config.maxFactionsPerUser < 1) {
    return { valid: false, error: 'maxFactionsPerUser must be at least 1' };
  }
  
  if (config.minFactionNameLength !== undefined && config.minFactionNameLength < 1) {
    return { valid: false, error: 'minFactionNameLength must be at least 1' };
  }
  
  if (config.maxFactionNameLength !== undefined && config.maxFactionNameLength > 100) {
    return { valid: false, error: 'maxFactionNameLength must be at most 100' };
  }
  
  if (config.minFactionNameLength !== undefined && 
      config.maxFactionNameLength !== undefined && 
      config.minFactionNameLength > config.maxFactionNameLength) {
    return { 
      valid: false, 
      error: 'minFactionNameLength must be less than or equal to maxFactionNameLength' 
    };
  }
  
  if (config.creationCooldown !== undefined && config.creationCooldown < 0) {
    return { valid: false, error: 'creationCooldown must be non-negative' };
  }
  
  return { valid: true };
}

/**
 * Merges partial configuration with defaults
 * @param partial Partial configuration to merge
 * @returns Complete configuration with defaults
 */
export function mergeWithDefaults(partial?: Partial<FactionSystemConfig>): FactionSystemConfig {
  return { ...defaultConfig, ...partial };
}
