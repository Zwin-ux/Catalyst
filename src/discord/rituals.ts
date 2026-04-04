export interface RitualPrompt {
  id: string;
  title: string;
  prompt: string;
  moduleId: string;
  cadence: 'daily';
  hostLine: string;
  followThrough: string;
  whyItWorks: string;
}

interface RitualTemplate {
  title: string;
  prompt: (themeLabel: string, seasonLabel: string) => string;
  followThrough: string;
  whyItWorks: string;
}

const QUESTION_LOOP: RitualTemplate[] = [
  {
    title: 'Question Loop: Tiny Win',
    prompt: (themeLabel, seasonLabel) =>
      `What is one tiny win this room can claim before the next ${seasonLabel.toLowerCase()} refresh? Keep it specific and doable. Theme bias: ${themeLabel}.`,
    followThrough: 'Ask people to reply in one sentence, then pin the strongest move or shout it out in recap.',
    whyItWorks: 'Tiny commitments are easier to answer than big essays, which makes quiet rooms move again.',
  },
  {
    title: 'Question Loop: Prediction',
    prompt: (_themeLabel, seasonLabel) =>
      `What changes first before the next ${seasonLabel.toLowerCase()} update: the board leader, the loudest topic, or the most helpful member? Make a call and say why.`,
    followThrough: 'Come back later, quote the best call, and reward the sharpest prediction in public.',
    whyItWorks: 'Predictions create friendly stakes, and stakes are fuel for repeat participation.',
  },
  {
    title: 'Question Loop: Hidden Signal',
    prompt: (themeLabel) =>
      `What almost got missed in chat this week that deserves a spotlight? Drop the moment, link, or idea. Current room theme: ${themeLabel}.`,
    followThrough: 'Turn the best answer into a Spotlight Drop or mention it in the next summary.',
    whyItWorks: 'Rooms feel better when good contributions do not disappear into scrollback.',
  },
  {
    title: 'Question Loop: Crew Fuel',
    prompt: (_themeLabel, seasonLabel) =>
      `If you had to give the current ${seasonLabel.toLowerCase()} one rule for the next 24 hours, what would it be?`,
    followThrough: 'Use the best answers to shape the next ritual or mod announcement.',
    whyItWorks: 'People respond faster when they can influence the rules of play, not just react to them.',
  },
  {
    title: 'Question Loop: One Move',
    prompt: (themeLabel) =>
      `Name one move this community should make next. It can be a post, a decision, a challenge, or a callback. Make it fit the ${themeLabel.toLowerCase()} mood.`,
    followThrough: 'Pick one answer and actually execute it so the room learns that participation changes the board.',
    whyItWorks: 'The loop only sticks when people see that answers lead to real actions.',
  },
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function dayStamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function composeRitualPrompt(input: {
  guildName: string;
  theme?: string;
  seasonName?: string;
  date?: Date;
}): RitualPrompt {
  const date = input.date || new Date();
  const seed = `${input.guildName}:${input.theme || 'Control Room'}:${input.seasonName || 'Season'}:${dayStamp(date)}`;
  const template = QUESTION_LOOP[hashSeed(seed) % QUESTION_LOOP.length];
  const themeLabel = input.theme?.trim() || 'Control Room';
  const seasonLabel = input.seasonName?.trim() || 'season';

  return {
    id: `question-loop:${dayStamp(date)}`,
    title: template.title,
    prompt: template.prompt(themeLabel, seasonLabel),
    moduleId: 'question-loop',
    cadence: 'daily',
    hostLine: `${input.guildName} can use this as today's reset prompt.`,
    followThrough: template.followThrough,
    whyItWorks: template.whyItWorks,
  };
}
