import { composeRitualPrompt } from '../src/discord/rituals';

describe('composeRitualPrompt', () => {
  it('builds a stable prompt for the same room and day', () => {
    const date = new Date('2026-04-04T12:00:00.000Z');

    const first = composeRitualPrompt({
      guildName: 'Catalyst HQ',
      theme: 'Night Shift',
      seasonName: 'Night Shift Season',
      date,
    });
    const second = composeRitualPrompt({
      guildName: 'Catalyst HQ',
      theme: 'Night Shift',
      seasonName: 'Night Shift Season',
      date,
    });

    expect(first.id).toBe('question-loop:2026-04-04');
    expect(first.title).toBe(second.title);
    expect(first.prompt).toBe(second.prompt);
    expect(first.prompt).toMatch(/night shift/i);
  });
});
