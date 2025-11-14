export interface PersonalityTraits {
  core: {
    chaos: number;
    cooperation: number;
    performative: number;
    loyalty: number;
    saltiness: number;
  };
  style: {
    emojiSpeak: number;
    capslock: number;
    essayMode: number;
    clown: number;
  };
  stability: {
    volatility: number;
    dramaHalfLifeHours: number;
  };
  lastUpdate: string;
}

export interface FactionTraits {
  chaos: number;
  cooperation: number;
  performative: number;
  entropy: number;
  lastUpdate: string;
}

const BASE_USER_CORE = {
  chaos: 0.5,
  cooperation: 0.5,
  performative: 0.5,
  loyalty: 0.5,
  saltiness: 0.5,
} as const;

const BASE_USER_STYLE = {
  emojiSpeak: 0.3,
  capslock: 0.3,
  essayMode: 0.3,
  clown: 0.3,
} as const;

const BASE_USER_STABILITY = {
  volatility: 0.4,
  dramaHalfLifeHours: 24,
} as const;

export const DEFAULT_TRAITS: PersonalityTraits = {
  core: {
    ...BASE_USER_CORE,
  },
  style: {
    ...BASE_USER_STYLE,
  },
  stability: {
    ...BASE_USER_STABILITY,
  },
  lastUpdate: new Date().toISOString(),
};

export const DEFAULT_FACTION_TRAITS: FactionTraits = {
  chaos: 0.5,
  cooperation: 0.5,
  performative: 0.5,
  entropy: 0.5,
  lastUpdate: new Date().toISOString(),
};

export function createDefaultTraits(): PersonalityTraits {
  return {
    core: { ...BASE_USER_CORE },
    style: { ...BASE_USER_STYLE },
    stability: { ...BASE_USER_STABILITY },
    lastUpdate: new Date().toISOString(),
  };
}

export function createDefaultFactionTraits(): FactionTraits {
  return {
    chaos: 0.5,
    cooperation: 0.5,
    performative: 0.5,
    entropy: 0.5,
    lastUpdate: new Date().toISOString(),
  };
}
