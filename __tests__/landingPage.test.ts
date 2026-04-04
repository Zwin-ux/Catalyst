import { listCatalystModules } from '../src/catalyst/modules';
import { renderLandingPage } from '../src/web/landing';

describe('renderLandingPage', () => {
  it('renders the slug assets and module rack', () => {
    const html = renderLandingPage({
      host: 'catalyst.example.com',
      baseUrl: 'https://catalyst.example.com',
      discordStatus: 'ready',
      persistence: 'postgres',
      timestamp: '2026-04-04T00:00:00.000Z',
      installReady: true,
      modules: listCatalystModules(),
    });

    expect(html).toContain('/assets/brand/catalyst-slug-app-icon.svg');
    expect(html).toContain('/assets/brand/catalyst-slug-mark.svg');
    expect(html).toContain('Module Rack');
    expect(html).toContain('/catalyst/modules');
    expect(html).toContain('Discord rituals, summaries, and season loops');
  });
});
