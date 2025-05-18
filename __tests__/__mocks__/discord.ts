import { Message, TextChannel, Guild, GuildMember, User, Client } from 'discord.js';

// Create a simple mock for TextChannel that implements the minimum required properties
const createMockTextChannel = (): any => ({
  send: jest.fn().mockResolvedValue(undefined),
  type: 'text',
  isTextBased: () => true,
  isDMBased: () => false,
  isVoiceBased: () => false,
  isThread: () => false,
  isThreadOnly: () => false,
  isVoice: () => false,
  isText: () => true,
});

export const createMockMessage = (content: string, options: Partial<Message> = {}): any => {
  const message = {
    content,
    author: {
      id: '123456789012345678',
      username: 'testuser',
      bot: false,
      ...options.author,
    },
    channel: {
      ...createMockTextChannel(),
      ...options.channel,
    },
    guild: {
      id: '987654321098765432',
      name: 'Test Guild',
      members: {
        cache: new Map(),
      },
      ...options.guild,
    } as unknown as Guild,
    member: {
      id: '123456789012345678',
      user: {
        id: '123456789012345678',
        username: 'testuser',
        bot: false,
      },
      ...options.member,
    } as GuildMember,
    reply: jest.fn().mockResolvedValue(undefined),
    ...options,
  } as unknown as Message;

  return message;
};

export const createMockGuild = (options: Partial<Guild> = {}): Guild => {
  return {
    id: '987654321098765432',
    name: 'Test Guild',
    members: {
      cache: new Map(),
    },
    channels: {
      cache: new Map(),
    },
    ...options,
  } as unknown as Guild;
};

export const createMockClient = (options: Partial<Client> = {}): Client => {
  return {
    user: {
      id: '123456789012345678',
      username: 'TestBot',
      bot: true,
      setPresence: jest.fn(),
      setStatus: jest.fn(),
    },
    guilds: {
      cache: new Map(),
    },
    channels: {
      cache: new Map(),
    },
    ...options,
  } as unknown as Client;
};
