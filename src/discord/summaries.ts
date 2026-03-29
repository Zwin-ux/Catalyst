import type { Collection, Message, Snowflake } from 'discord.js';

const STOP_WORDS = new Set([
  'this',
  'that',
  'with',
  'have',
  'from',
  'your',
  'there',
  'about',
  'would',
  'could',
  'should',
  'they',
  'them',
  'just',
  'like',
  'into',
  'were',
  'what',
  'when',
  'where',
  'will',
  'then',
  'than',
  'also',
  'because',
  'been',
  'being',
  'make',
  'made',
  'some',
  'more',
  'very',
  'here',
  'only',
  'really',
  'their',
  'need',
  'lets',
  'http',
  'https',
]);

export interface ChannelSummary {
  title: string;
  totalMessages: number;
  participantCount: number;
  topParticipants: Array<{ name: string; count: number }>;
  themes: string[];
  highlights: string[];
  actionItems: string[];
}

export interface SummaryCapableChannel {
  name?: string;
  messages: {
    fetch: (options: {
      limit: number;
      around?: Snowflake;
    }) => Promise<Collection<Snowflake, Message>>;
  };
}

export async function summarizeChannel(
  channel: SummaryCapableChannel,
  options: { limit?: number; aroundMessageId?: Snowflake } = {},
): Promise<ChannelSummary> {
  const fetchLimit = Math.min(Math.max(options.limit ?? 30, 10), 100);
  const fetched = await channel.messages.fetch({
    limit: fetchLimit,
    around: options.aroundMessageId,
  });

  const messages = Array.from(fetched.values())
    .filter((message) => !message.author.bot && normalizeText(message.content).length > 0)
    .sort((left, right) => left.createdTimestamp - right.createdTimestamp);

  const participantCounts = new Map<string, { name: string; count: number }>();
  const tokenCounts = new Map<string, number>();
  const highlights: Array<{ score: number; text: string }> = [];
  const actionItems = new Set<string>();

  for (const message of messages) {
    const authorName = message.member?.displayName || message.author.globalName || message.author.username;
    participantCounts.set(message.author.id, {
      name: authorName,
      count: (participantCounts.get(message.author.id)?.count || 0) + 1,
    });

    const content = normalizeText(message.content);
    for (const token of tokenize(content)) {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    }

    const highlightScore =
      (message.reactions.cache?.size || 0) * 2 +
      message.attachments.size * 2 +
      message.mentions.users.size +
      Math.min(content.length / 120, 2);
    highlights.push({
      score: highlightScore,
      text: `${authorName}: ${truncate(content, 120)}`,
    });

    const actionItem = extractActionItem(content, authorName);
    if (actionItem) {
      actionItems.add(actionItem);
    }
  }

  const topParticipants = Array.from(participantCounts.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);

  const themes = Array.from(tokenCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([token]) => token);

  const topHighlights = highlights
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.text)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 3);

  return {
    title: channel.name ? `Summary for #${channel.name}` : 'Channel summary',
    totalMessages: messages.length,
    participantCount: participantCounts.size,
    topParticipants,
    themes,
    highlights: topHighlights.length > 0 ? topHighlights : ['No standout moments yet.'],
    actionItems:
      Array.from(actionItems).slice(0, 3).length > 0
        ? Array.from(actionItems).slice(0, 3)
        : ['No clear action items surfaced in this slice.'],
  };
}

function normalizeText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }
  return `${input.slice(0, maxLength - 1)}…`;
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function extractActionItem(content: string, authorName: string): string | null {
  const lower = content.toLowerCase();
  const patterns = [
    'need to',
    'should',
    "let's",
    'lets',
    'todo',
    'follow up',
    'can we',
    'please',
  ];

  if (!patterns.some((pattern) => lower.includes(pattern)) && !content.includes('?')) {
    return null;
  }

  return `${authorName}: ${truncate(content, 100)}`;
}
