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

export const defaultConfig: FactionSystemConfig = {
  enabled: true,
  cooldowns: {
    createFaction: 24 * 60 * 60 * 1000, // 24 hours
    renameFaction: 7 * 24 * 60 * 60 * 1000, // 7 days
    changeDescription: 24 * 60 * 60 * 1000, // 24 hours
    inviteMember: 60 * 1000, // 1 minute
    kickMember: 60 * 1000, // 1 minute
    promoteMember: 60 * 1000, // 1 minute
    demoteMember: 60 * 1000, // 1 minute
    leaveFaction: 24 * 60 * 60 * 1000, // 24 hours
    disbandFaction: 7 * 24 * 60 * 60 * 1000, // 7 days
    creationCooldown: 24 * 60 * 60 * 1000, // 24 hours
  },
  maxFactionNameLength: 32,
  maxFactionDescriptionLength: 500,
  defaultFactionPower: 100,
  maxFactionsPerUser: 1,
  maxMembersPerFaction: 50,
  startingPower: 100,
  powerDecayRate: 0.05, // 5% per interval
  powerDecayInterval: 7 * 24 * 60 * 60 * 1000, // 1 week
  powerDecayThreshold: 30 * 24 * 60 * 60 * 1000, // 30 days
  powerDecayMinimum: 0.5, // 50% of original power
  powerDecayMaximum: 1, // 100% of original power
  powerDecayEnabled: true,
  enableFactionChannels: true,
  enableFactionRoles: true,
  logger: console,
};
