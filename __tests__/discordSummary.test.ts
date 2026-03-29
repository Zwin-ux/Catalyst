import { summarizeChannel } from '../src/discord/summaries';

describe('summarizeChannel', () => {
  it('extracts participants, themes, and action items from recent messages', async () => {
    const now = Date.now();
    const makeMessage = (id: string, authorId: string, name: string, content: string, offset: number) =>
      ({
        id,
        content,
        createdTimestamp: now + offset,
        author: { id: authorId, username: name, globalName: name, bot: false },
        member: { displayName: name },
        reactions: { cache: { size: 0 } },
        attachments: { size: 0 },
        mentions: { users: { size: 0 } },
      }) as any;

    const messages = new Map([
      ['1', makeMessage('1', 'u1', 'Mason', 'We should ship the recap board tonight.', 1)],
      ['2', makeMessage('2', 'u2', 'Rin', 'Need to lock Railway and database setup next.', 2)],
      ['3', makeMessage('3', 'u1', 'Mason', 'Railway health checks look good and summary commands are in.', 3)],
      ['4', makeMessage('4', 'u3', 'Ari', 'Can we keep the Discord summary super clear for mods?', 4)],
    ]);

    const summary = await summarizeChannel({
      name: 'control-room',
      messages: {
        fetch: async () => messages as any,
      },
    });

    expect(summary.title).toContain('control-room');
    expect(summary.totalMessages).toBe(4);
    expect(summary.participantCount).toBe(3);
    expect(summary.topParticipants[0]?.name).toBe('Mason');
    expect(summary.themes).toContain('railway');
    expect(summary.actionItems.some((item) => item.includes('should ship'))).toBe(true);
  });
});
