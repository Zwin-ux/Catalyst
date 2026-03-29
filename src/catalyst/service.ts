import { randomUUID } from 'crypto';

import type {
  CatalystState,
  ConsentRecord,
  CrewState,
  GuildInstallation,
  GuildOverview,
  JoinSeasonResult,
  LeaderboardEntry,
  MemberProfile,
  Season,
  SeasonEvent,
  SeasonMembership,
  SetupInput,
} from './types';
import { CatalystStateRepository, createCatalystStateStore } from './store';

const DEFAULT_CONSENT_COPY =
  'Catalyst tracks only explicit season participation, votes, and bot-led rituals. You can leave at any time with /optout.';
const DEFAULT_QUIET_HOURS = '22:00-08:00';
const DEFAULT_THEME = 'Control Room';
const WELCOME_SCORE = 15;

function nowIso(): string {
  return new Date().toISOString();
}

function createDefaultCrews(): CrewState[] {
  return [
    {
      id: 'signal',
      name: 'Signal',
      color: 0x68d5ff,
      accentHex: '#68d5ff',
      description: 'Clean operators who keep the room in sync.',
      memberIds: [],
      points: 0,
    },
    {
      id: 'relay',
      name: 'Relay',
      color: 0x84a7ff,
      accentHex: '#84a7ff',
      description: 'Momentum builders who keep streaks alive.',
      memberIds: [],
      points: 0,
    },
    {
      id: 'ember',
      name: 'Ember',
      color: 0xff8b67,
      accentHex: '#ff8b67',
      description: 'Spotlight thieves who turn moments into highlights.',
      memberIds: [],
      points: 0,
    },
  ];
}

function cloneSeason(season: Season): Season {
  return {
    ...season,
    crews: season.crews.map((crew) => ({
      ...crew,
      memberIds: [...crew.memberIds],
    })),
  };
}

export class CatalystService {
  constructor(
    private readonly store: CatalystStateRepository = createCatalystStateStore(),
  ) {}

  async configureGuild(input: SetupInput): Promise<GuildInstallation> {
    const timestamp = nowIso();
    const state = await this.store.update((current) => {
      const existing = current.guildInstallations[input.guildId];
      const installation: GuildInstallation = {
        guildId: input.guildId,
        guildName: input.guildName,
        installState: 'ready',
        announceChannelId: input.announceChannelId ?? existing?.announceChannelId,
        consentCopy: input.consentCopy?.trim() || existing?.consentCopy || DEFAULT_CONSENT_COPY,
        quietHours: input.quietHours?.trim() || existing?.quietHours || DEFAULT_QUIET_HOURS,
        theme: input.theme?.trim() || existing?.theme || DEFAULT_THEME,
        createdAt: existing?.createdAt || timestamp,
        updatedAt: timestamp,
      };

      current.guildInstallations[input.guildId] = installation;
      this.recordEvent(current, {
        guildId: input.guildId,
        seasonId: this.getActiveSeasonId(current, input.guildId),
        type: 'guild_configured',
        summary: `${installation.guildName} configured Catalyst for hosted seasons.`,
      });
      return current;
    });

    return state.guildInstallations[input.guildId];
  }

  async getGuildOverview(guildId: string): Promise<GuildOverview | null> {
    const state = await this.store.read();
    const installation = state.guildInstallations[guildId];
    if (!installation) {
      return null;
    }

    const activeSeason = this.findActiveSeason(state, guildId);
    const activeMembers = Object.values(state.memberships).filter(
      (membership) =>
        membership.guildId === guildId &&
        membership.seasonId === activeSeason?.id &&
        !membership.optedOutAt,
    ).length;

    return {
      installation,
      activeSeason,
      activeMembers,
    };
  }

  async startSeason(guildId: string, name?: string): Promise<Season> {
    const timestamp = nowIso();
    const state = await this.store.update((current) => {
      const installation = current.guildInstallations[guildId];
      if (!installation) {
        throw new Error('Run /setup before starting a season.');
      }

      const currentActive = this.findActiveSeason(current, guildId);
      if (currentActive) {
        throw new Error('A season is already active in this server.');
      }

      const season: Season = {
        id: randomUUID(),
        guildId,
        name: name?.trim() || `${installation.theme} Season`,
        week: 1,
        status: 'active',
        createdAt: timestamp,
        startedAt: timestamp,
        crews: createDefaultCrews(),
      };

      current.seasons[season.id] = season;
      this.recordEvent(current, {
        guildId,
        seasonId: season.id,
        type: 'season_started',
        summary: `${season.name} is live with ${season.crews.length} crews.`,
      });
      return current;
    });

    return this.getRequiredActiveSeason(state, guildId);
  }

  async markSeasonAnnouncement(guildId: string, messageId: string): Promise<Season> {
    const state = await this.store.update((current) => {
      const season = this.requireActiveSeason(current, guildId);
      season.joinMessageId = messageId;
      current.seasons[season.id] = season;
      this.recordEvent(current, {
        guildId,
        seasonId: season.id,
        type: 'season_announced',
        summary: `${season.name} announcement board went live.`,
      });
      return current;
    });

    return this.getRequiredActiveSeason(state, guildId);
  }

  async endSeason(guildId: string): Promise<Season> {
    const timestamp = nowIso();
    const state = await this.store.update((current) => {
      const season = this.requireActiveSeason(current, guildId);
      season.status = 'completed';
      season.endedAt = timestamp;
      current.seasons[season.id] = season;
      const summaryId = randomUUID();
      current.summaries[summaryId] = {
        id: summaryId,
        guildId,
        seasonId: season.id,
        headline: `${season.name} complete`,
        body: this.buildSummaryBody(season),
        createdAt: timestamp,
      };
      this.recordEvent(current, {
        guildId,
        seasonId: season.id,
        type: 'season_completed',
        summary: `${season.name} wrapped with ${season.crews.reduce((sum, crew) => sum + crew.points, 0)} total points.`,
      });
      return current;
    });

    const season = Object.values(state.seasons)
      .filter((entry) => entry.guildId === guildId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

    if (!season) {
      throw new Error('Season could not be ended.');
    }

    return season;
  }

  async joinSeason(guildId: string, userId: string, displayName: string): Promise<JoinSeasonResult> {
    const state = await this.store.update((current) => {
      const season = this.requireActiveSeason(current, guildId);
      const installation = current.guildInstallations[guildId];
      if (!installation) {
        throw new Error('Run /setup before joining a season.');
      }

      const existingMembership = this.findMembership(current, season.id, userId);
      if (existingMembership && !existingMembership.optedOutAt) {
        return current;
      }

      const crew = this.pickCrew(season);
      if (existingMembership) {
        existingMembership.crewId = crew.id;
        existingMembership.displayName = displayName;
        existingMembership.consentedAt = nowIso();
        existingMembership.optedOutAt = undefined;
        existingMembership.score += WELCOME_SCORE;
        existingMembership.streak = Math.max(existingMembership.streak, 1);
        current.memberships[existingMembership.id] = existingMembership;
      } else {
        const membership: SeasonMembership = {
          id: randomUUID(),
          guildId,
          seasonId: season.id,
          userId,
          displayName,
          crewId: crew.id,
          consentedAt: nowIso(),
          score: WELCOME_SCORE,
          streak: 1,
        };
        current.memberships[membership.id] = membership;
      }

      const updatedSeason = cloneSeason(season);
      updatedSeason.crews = updatedSeason.crews.map((entry) => {
        if (entry.id !== crew.id) {
          return entry;
        }

        const nextIds = new Set(entry.memberIds);
        nextIds.add(userId);
        return {
          ...entry,
          memberIds: Array.from(nextIds),
          points: entry.points + WELCOME_SCORE,
        };
      });

      current.seasons[season.id] = updatedSeason;
      this.upsertConsent(current, guildId, season.id, userId, installation.consentCopy, 'granted');
      this.recordEvent(current, {
        guildId,
        seasonId: season.id,
        actorId: userId,
        crewId: crew.id,
        type: 'member_joined',
        summary: `${displayName} joined ${crew.name}.`,
      });
      return current;
    });

    const season = this.getRequiredActiveSeason(state, guildId);
    const membership = this.findMembership(state, season.id, userId);
    if (!membership) {
      throw new Error('Join state could not be created.');
    }
    const crew = season.crews.find((entry) => entry.id === membership.crewId);
    if (!crew) {
      throw new Error('Joined crew could not be found.');
    }

    return {
      membership,
      crew,
      season,
      joinedNow: !membership.optedOutAt,
    };
  }

  async optOut(guildId: string, userId: string): Promise<SeasonMembership> {
    const timestamp = nowIso();
    const state = await this.store.update((current) => {
      const season = this.requireActiveSeason(current, guildId);
      const membership = this.findMembership(current, season.id, userId);
      if (!membership || membership.optedOutAt) {
        throw new Error('You are not currently in this season.');
      }

      membership.optedOutAt = timestamp;
      current.memberships[membership.id] = membership;

      const updatedSeason = cloneSeason(season);
      updatedSeason.crews = updatedSeason.crews.map((crew) => ({
        ...crew,
        memberIds: crew.memberIds.filter((memberId) => memberId !== userId),
      }));
      current.seasons[season.id] = updatedSeason;

      const installation = current.guildInstallations[guildId];
      this.upsertConsent(
        current,
        guildId,
        season.id,
        userId,
        installation?.consentCopy || DEFAULT_CONSENT_COPY,
        'withdrawn',
      );
      this.recordEvent(current, {
        guildId,
        seasonId: season.id,
        actorId: userId,
        crewId: membership.crewId,
        type: 'member_opted_out',
        summary: `${membership.displayName} left the active season.`,
      });
      return current;
    });

    const season = this.getRequiredActiveSeason(state, guildId);
    const membership = this.findMembership(state, season.id, userId);
    if (!membership) {
      throw new Error('Opt-out state could not be found.');
    }
    return membership;
  }

  async getProfile(guildId: string, userId: string): Promise<MemberProfile | null> {
    const state = await this.store.read();
    const season = this.findActiveSeason(state, guildId);
    if (!season) {
      return null;
    }

    const membership = this.findMembership(state, season.id, userId);
    if (!membership || membership.optedOutAt) {
      return null;
    }

    const crew = season.crews.find((entry) => entry.id === membership.crewId);
    if (!crew) {
      return null;
    }

    return { membership, season, crew };
  }

  async getLeaderboard(guildId: string): Promise<LeaderboardEntry[]> {
    const state = await this.store.read();
    const season = this.findActiveSeason(state, guildId);
    if (!season) {
      return [];
    }

    return season.crews
      .map((crew) => ({
        crewId: crew.id,
        crewName: crew.name,
        points: crew.points,
        memberCount: crew.memberIds.length,
      }))
      .sort((left, right) => right.points - left.points || right.memberCount - left.memberCount);
  }

  async getRecentEvents(guildId: string, limit = 5): Promise<SeasonEvent[]> {
    const state = await this.store.read();
    return Object.values(state.events)
      .filter((event) => event.guildId === guildId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  async getConsentCopy(guildId: string): Promise<string> {
    const state = await this.store.read();
    return state.guildInstallations[guildId]?.consentCopy || DEFAULT_CONSENT_COPY;
  }

  private getRequiredActiveSeason(state: CatalystState, guildId: string): Season {
    const season = this.findActiveSeason(state, guildId);
    if (!season) {
      throw new Error('No active season found.');
    }
    return season;
  }

  private findActiveSeason(state: CatalystState, guildId: string): Season | null {
    return (
      Object.values(state.seasons)
        .filter((season) => season.guildId === guildId && season.status === 'active')
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] || null
    );
  }

  private getActiveSeasonId(state: CatalystState, guildId: string): string {
    return this.findActiveSeason(state, guildId)?.id || 'pending';
  }

  private requireActiveSeason(state: CatalystState, guildId: string): Season {
    const season = this.findActiveSeason(state, guildId);
    if (!season) {
      throw new Error('Start a season before using this flow.');
    }
    return cloneSeason(season);
  }

  private pickCrew(season: Season): CrewState {
    return [...season.crews].sort((left, right) => {
      if (left.memberIds.length !== right.memberIds.length) {
        return left.memberIds.length - right.memberIds.length;
      }
      return left.points - right.points;
    })[0];
  }

  private findMembership(state: CatalystState, seasonId: string, userId: string): SeasonMembership | null {
    return (
      Object.values(state.memberships).find(
        (membership) => membership.seasonId === seasonId && membership.userId === userId,
      ) || null
    );
  }

  private recordEvent(
    state: CatalystState,
    input: Omit<SeasonEvent, 'id' | 'createdAt'>,
  ): void {
    if (input.seasonId === 'pending') {
      return;
    }

    const event: SeasonEvent = {
      id: randomUUID(),
      createdAt: nowIso(),
      ...input,
    };
    state.events[event.id] = event;
  }

  private upsertConsent(
    state: CatalystState,
    guildId: string,
    seasonId: string,
    userId: string,
    copy: string,
    status: ConsentRecord['status'],
  ): void {
    const existing = Object.values(state.consentRecords).find(
      (record) =>
        record.guildId === guildId &&
        record.seasonId === seasonId &&
        record.userId === userId,
    );

    if (existing) {
      existing.copy = copy;
      existing.status = status;
      existing.updatedAt = nowIso();
      state.consentRecords[existing.id] = existing;
      return;
    }

    const record: ConsentRecord = {
      id: randomUUID(),
      guildId,
      seasonId,
      userId,
      copy,
      status,
      updatedAt: nowIso(),
    };
    state.consentRecords[record.id] = record;
  }

  private buildSummaryBody(season: Season): string {
    const orderedCrews = [...season.crews].sort((left, right) => right.points - left.points);
    const headline = orderedCrews
      .map((crew, index) => `${index + 1}. ${crew.name} ${crew.points} pts`)
      .join(' | ');
    return `Final board: ${headline}`;
  }
}
