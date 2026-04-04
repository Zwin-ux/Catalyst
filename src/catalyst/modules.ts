export type CatalystModuleStatus = 'live' | 'beta' | 'next';
export type CatalystModuleCategory =
  | 'ritual'
  | 'summary'
  | 'competition'
  | 'spotlight'
  | 'platform';
export type CatalystModuleCadence = 'on-demand' | 'daily' | 'weekly';

export interface CatalystModule {
  id: string;
  name: string;
  status: CatalystModuleStatus;
  category: CatalystModuleCategory;
  cadence: CatalystModuleCadence;
  description: string;
  whyItSticks: string;
  commands: string[];
  hooks: string[];
}

const DEFAULT_MODULES: CatalystModule[] = [
  {
    id: 'season-board',
    name: 'Season Board',
    status: 'live',
    category: 'competition',
    cadence: 'weekly',
    description:
      'Runs crew seasons with clear onboarding, visible scores, and low-friction board resets.',
    whyItSticks:
      'People keep checking back when the room has a visible race, a team to root for, and a recap to chase.',
    commands: ['/setup', '/season start', '/join', '/leaderboard'],
    hooks: ['season:start', 'season:join', 'season:announce', 'season:complete'],
  },
  {
    id: 'channel-digest',
    name: 'Channel Digest',
    status: 'live',
    category: 'summary',
    cadence: 'on-demand',
    description:
      'Summarizes active channels and threads into fast reads for moderators and members.',
    whyItSticks:
      'Digest commands reduce catch-up fatigue, which makes busy rooms feel useful instead of overwhelming.',
    commands: ['/summary channel', '/summary season', 'Summarize From Here'],
    hooks: ['summary:collect', 'summary:render'],
  },
  {
    id: 'question-loop',
    name: 'Question Loop',
    status: 'live',
    category: 'ritual',
    cadence: 'daily',
    description:
      'Drops high-signal prompts that turn quiet channels into lightweight check-ins, takes, or predictions.',
    whyItSticks:
      'A good prompt gives people one obvious thing to do right now, which is the easiest way to restart a cold room.',
    commands: ['/ritual prompt'],
    hooks: ['ritual:compose', 'ritual:publish'],
  },
  {
    id: 'spotlight-drop',
    name: 'Spotlight Drop',
    status: 'beta',
    category: 'spotlight',
    cadence: 'weekly',
    description:
      'Packages highlights, member wins, and room-defining moments into a clean spotlight post.',
    whyItSticks:
      'Recognition loops are retention loops. People return when the room notices good moves in public.',
    commands: ['/announce'],
    hooks: ['spotlight:score', 'spotlight:publish'],
  },
  {
    id: 'plugin-slots',
    name: 'Plugin Slots',
    status: 'beta',
    category: 'platform',
    cadence: 'on-demand',
    description:
      'Defines stable hooks for custom rituals, recap renderers, and community-specific season logic.',
    whyItSticks:
      'The best communities all run different games. Plugin slots let Catalyst become their engine instead of their limit.',
    commands: ['/ritual modules'],
    hooks: ['plugin:register', 'plugin:validate', 'plugin:run'],
  },
  {
    id: 'showdown-engine',
    name: 'Showdown Engine',
    status: 'next',
    category: 'competition',
    cadence: 'weekly',
    description:
      'Creates scheduled showdowns, votes, and challenge rounds that spike activity at predictable moments.',
    whyItSticks:
      'Rooms need set-piece moments, not just passive leaderboards. Showdowns create those spikes on purpose.',
    commands: ['/season start'],
    hooks: ['showdown:seed', 'showdown:open', 'showdown:resolve'],
  },
];

export function listCatalystModules(): CatalystModule[] {
  return DEFAULT_MODULES.map((module) => ({
    ...module,
    commands: [...module.commands],
    hooks: [...module.hooks],
  }));
}
