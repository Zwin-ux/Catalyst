import { db } from '../../db';
import { DramaEvent, User } from '../../db/models';
import { PersonalityTraits, createDefaultTraits } from '../../types/personality';

export const personalityConfig = {
  enabled: true,
  maxDeltaPerEvent: 0.2,
  defaultDramaHalfLifeHours: 24,
};

type TraitDelta = Partial<{
  core: Partial<PersonalityTraits['core']>;
  style: Partial<PersonalityTraits['style']>;
  stability: Partial<PersonalityTraits['stability']>;
}>;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const clampDelta = (value: number): number => {
  const maxDelta = personalityConfig.maxDeltaPerEvent;
  return Math.max(-maxDelta, Math.min(maxDelta, value));
};

function cloneTraits(traits: PersonalityTraits): PersonalityTraits {
  return JSON.parse(JSON.stringify(traits)) as PersonalityTraits;
}

function normalizeTraits(raw: unknown): PersonalityTraits {
  const defaults = createDefaultTraits();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const source = raw as Partial<PersonalityTraits>;
  const normalized: PersonalityTraits = {
    core: {
      chaos: clamp01(Number(source.core?.chaos ?? defaults.core.chaos)),
      cooperation: clamp01(Number(source.core?.cooperation ?? defaults.core.cooperation)),
      performative: clamp01(Number(source.core?.performative ?? defaults.core.performative)),
      loyalty: clamp01(Number(source.core?.loyalty ?? defaults.core.loyalty)),
      saltiness: clamp01(Number(source.core?.saltiness ?? defaults.core.saltiness)),
    },
    style: {
      emojiSpeak: clamp01(Number(source.style?.emojiSpeak ?? defaults.style.emojiSpeak)),
      capslock: clamp01(Number(source.style?.capslock ?? defaults.style.capslock)),
      essayMode: clamp01(Number(source.style?.essayMode ?? defaults.style.essayMode)),
      clown: clamp01(Number(source.style?.clown ?? defaults.style.clown)),
    },
    stability: {
      volatility: clamp01(Number(source.stability?.volatility ?? defaults.stability.volatility)),
      dramaHalfLifeHours:
        Number(source.stability?.dramaHalfLifeHours ?? defaults.stability.dramaHalfLifeHours) ||
        personalityConfig.defaultDramaHalfLifeHours,
    },
    lastUpdate:
      typeof source.lastUpdate === 'string' ? source.lastUpdate : defaults.lastUpdate,
  };

  return normalized;
}

function computeTraitDeltaFromEvent(event: DramaEvent, role: 'actor' | 'target'): TraitDelta {
  const intensity = clamp01((typeof event.score === 'number' ? event.score : 0) / 100);
  const delta: TraitDelta = { core: {}, style: {} };
  const type = event.type?.toString().toUpperCase();

  if (type === 'SHOWDOWN') {
    if (role === 'actor') {
      delta.core!.chaos = clampDelta(0.1 * intensity);
      delta.core!.performative = clampDelta(0.1 * intensity);
      delta.core!.loyalty = clampDelta(-0.05 * intensity);
    } else {
      delta.core!.saltiness = clampDelta(0.08 * intensity);
      delta.core!.loyalty = clampDelta(-0.02 * intensity);
    }
  }

  if (type === 'PLOT_TWIST') {
    delta.core!.chaos = clampDelta(0.08 * intensity);
    delta.style!.clown = clampDelta(0.05 * intensity);
  }

  if (type === 'AURA_OFF' && role === 'actor') {
    delta.core!.cooperation = clampDelta(0.07 * intensity);
    delta.core!.saltiness = clampDelta(-0.05 * intensity);
  }

  if (type === 'SPOTLIGHT' && role === 'actor') {
    delta.core!.performative = clampDelta(0.05 * intensity);
  }

  return delta;
}

function applyDelta(traits: PersonalityTraits, delta: TraitDelta): PersonalityTraits {
  const updated = cloneTraits(traits);

  if (delta.core) {
    for (const [key, change] of Object.entries(delta.core)) {
      if (typeof change !== 'number') continue;
      updated.core[key as keyof PersonalityTraits['core']] = clamp01(
        updated.core[key as keyof PersonalityTraits['core']] + change,
      );
    }
  }

  if (delta.style) {
    for (const [key, change] of Object.entries(delta.style)) {
      if (typeof change !== 'number') continue;
      updated.style[key as keyof PersonalityTraits['style']] = clamp01(
        updated.style[key as keyof PersonalityTraits['style']] + change,
      );
    }
  }

  if (delta.stability) {
    if (typeof delta.stability.volatility === 'number') {
      updated.stability.volatility = clamp01(
        updated.stability.volatility + clampDelta(delta.stability.volatility),
      );
    }
    if (typeof delta.stability.dramaHalfLifeHours === 'number') {
      const proposed = updated.stability.dramaHalfLifeHours + delta.stability.dramaHalfLifeHours;
      updated.stability.dramaHalfLifeHours = Math.max(1, proposed);
    }
  }

  updated.lastUpdate = new Date().toISOString();
  return updated;
}

function decayTrait(value: number, hoursSince: number, halfLifeHours: number): number {
  if (!isFinite(hoursSince) || hoursSince <= 0) return clamp01(value);
  const lambda = Math.log(2) / (halfLifeHours > 0 ? halfLifeHours : personalityConfig.defaultDramaHalfLifeHours);
  const decayed = 0.5 + (value - 0.5) * Math.exp(-lambda * hoursSince);
  return clamp01(decayed);
}

async function ensureUser(userId: string): Promise<User | null> {
  let user = await db.getUser(userId);
  if (!user) {
    user = {
      id: userId,
      username: `user_${userId}`,
      dramaPoints: 0,
      karma: 0,
      factionId: null,
      roleHistory: [],
      lastActive: new Date().toISOString(),
      traits: createDefaultTraits(),
      badges: [],
    };
    const saved = await db.saveUser(user);
    if (!saved) {
      return null;
    }
  }

  if (!user.traits) {
    user.traits = createDefaultTraits();
    await db.updateUser(userId, { traits: user.traits });
  }

  return user;
}

function extractActorIds(event: DramaEvent): string[] {
  const ids = new Set<string>();
  if (event.actorId) ids.add(event.actorId);
  if (event.initiatorId) ids.add(event.initiatorId);
  if (event.participants && event.participants.length > 0) {
    ids.add(event.participants[0]);
  }
  return Array.from(ids).filter(Boolean);
}

function extractTargetIds(event: DramaEvent): string[] {
  if (event.targetIds && event.targetIds.length) {
    return event.targetIds.filter(Boolean);
  }
  if (event.participants && event.participants.length > 1) {
    return event.participants.slice(1).filter(Boolean);
  }
  return [];
}

export async function getUserTraits(userId: string): Promise<PersonalityTraits> {
  const user = await db.getUser(userId);
  if (!user) {
    return createDefaultTraits();
  }
  return normalizeTraits(user.traits);
}

export async function setUserTraits(userId: string, traits: PersonalityTraits): Promise<void> {
  const updated = cloneTraits(traits);
  updated.lastUpdate = new Date().toISOString();
  const success = await db.updateUser(userId, { traits: updated });
  if (!success) {
    throw new Error(`Failed to persist traits for user ${userId}`);
  }
}

export async function applyEventToUserTraits(eventId: string): Promise<void> {
  if (!personalityConfig.enabled) return;
  const event = await db.getDramaEventById(eventId);
  if (!event) return;

  const actorIds = extractActorIds(event);
  const targetIds = extractTargetIds(event);

  for (const actorId of actorIds) {
    const user = await ensureUser(actorId);
    if (!user) continue;
    const traits = normalizeTraits(user.traits);
    const updated = applyDelta(traits, computeTraitDeltaFromEvent(event, 'actor'));
    await setUserTraits(actorId, updated);
  }

  for (const targetId of targetIds) {
    const user = await ensureUser(targetId);
    if (!user) continue;
    const traits = normalizeTraits(user.traits);
    const updated = applyDelta(traits, computeTraitDeltaFromEvent(event, 'target'));
    await setUserTraits(targetId, updated);
  }
}

export async function applyRecentEventsToTraits(since: Date): Promise<void> {
  if (!personalityConfig.enabled) return;
  const events = await db.getDramaEventsSince(since);
  for (const event of events) {
    await applyEventToUserTraits(event.id);
  }
}

export async function decayAllUserTraits(): Promise<void> {
  if (!personalityConfig.enabled) return;
  const users = await db.getAllUsers();
  const now = Date.now();

  for (const user of users) {
    const traits = normalizeTraits(user.traits);
    const lastUpdate = new Date(traits.lastUpdate).getTime();
    const hoursSince = isFinite(lastUpdate) ? (now - lastUpdate) / (1000 * 60 * 60) : 0;
    if (hoursSince <= 0) continue;

    const halfLife = traits.stability.dramaHalfLifeHours || personalityConfig.defaultDramaHalfLifeHours;

    const decayed: PersonalityTraits = {
      ...traits,
      core: {
        chaos: decayTrait(traits.core.chaos, hoursSince, halfLife),
        cooperation: decayTrait(traits.core.cooperation, hoursSince, halfLife),
        performative: decayTrait(traits.core.performative, hoursSince, halfLife),
        loyalty: decayTrait(traits.core.loyalty, hoursSince, halfLife),
        saltiness: decayTrait(traits.core.saltiness, hoursSince, halfLife),
      },
      style: {
        emojiSpeak: decayTrait(traits.style.emojiSpeak, hoursSince, halfLife),
        capslock: decayTrait(traits.style.capslock, hoursSince, halfLife),
        essayMode: decayTrait(traits.style.essayMode, hoursSince, halfLife),
        clown: decayTrait(traits.style.clown, hoursSince, halfLife),
      },
      lastUpdate: new Date().toISOString(),
    };

    await setUserTraits(user.id, decayed);
  }
}
