// Mock the logger to avoid console output during tests
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

global.console = {
  ...console,
  ...mockLogger,
};

// Mock Discord.js Client
jest.mock('discord.js', () => {
  const original = jest.requireActual('discord.js');
  
  return {
    ...original,
    Client: jest.fn().mockImplementation(() => ({
      login: jest.fn(),
      on: jest.fn(),
      user: {
        setPresence: jest.fn(),
        setStatus: jest.fn(),
      },
      channels: {
        cache: {
          get: jest.fn(),
          find: jest.fn(),
        },
      },
      guilds: {
        cache: {
          get: jest.fn(),
          find: jest.fn(),
        },
      },
    })),
  };
});
