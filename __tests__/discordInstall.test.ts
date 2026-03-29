import { buildDiscordInstallUrl, getCatalystInstallPermissions } from '../src/discord/install';

describe('Discord install helpers', () => {
  it('builds a Discord OAuth install URL with command and bot scopes', () => {
    const url = buildDiscordInstallUrl('123456789');

    expect(url).toContain('https://discord.com/oauth2/authorize?');
    expect(url).toContain('client_id=123456789');
    expect(url).toContain('scope=bot+applications.commands');
    expect(url).toContain(`permissions=${getCatalystInstallPermissions()}`);
  });
});
