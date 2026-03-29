import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { CatalystService, CatalystStateStore } from '../src/catalyst';

describe('CatalystService', () => {
  let tempDir: string;
  let service: CatalystService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'catalyst-service-'));
    service = new CatalystService(
      new CatalystStateStore(join(tempDir, 'state.json')),
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('configures a guild and starts a season', async () => {
    const setup = await service.configureGuild({
      guildId: 'guild-1',
      guildName: 'Catalyst HQ',
      announceChannelId: 'channel-1',
      theme: 'Night Shift',
    });

    expect(setup.guildName).toBe('Catalyst HQ');
    expect(setup.installState).toBe('ready');

    const season = await service.startSeason('guild-1');
    expect(season.status).toBe('active');
    expect(season.name).toContain('Night Shift');
    expect(season.crews).toHaveLength(3);
  });

  it('joins, scores, and opts out a member cleanly', async () => {
    await service.configureGuild({
      guildId: 'guild-1',
      guildName: 'Catalyst HQ',
    });
    await service.startSeason('guild-1', 'Control Room Season');

    const firstJoin = await service.joinSeason('guild-1', 'user-1', 'Mason');
    expect(firstJoin.membership.score).toBe(15);
    expect(firstJoin.membership.streak).toBe(1);
    expect(firstJoin.season.crews.some((crew) => crew.memberIds.includes('user-1'))).toBe(true);

    const profile = await service.getProfile('guild-1', 'user-1');
    expect(profile?.crew.id).toBe(firstJoin.crew.id);

    const leaderboard = await service.getLeaderboard('guild-1');
    expect(leaderboard[0]?.points).toBeGreaterThan(0);

    const optOut = await service.optOut('guild-1', 'user-1');
    expect(optOut.optedOutAt).toBeTruthy();

    const clearedProfile = await service.getProfile('guild-1', 'user-1');
    expect(clearedProfile).toBeNull();
  });
});
