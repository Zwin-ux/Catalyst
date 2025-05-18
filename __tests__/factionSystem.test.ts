import { FactionSystemPlugin } from '../plugins/faction-system/src/factionSystem';
import { createMockMessage, createMockClient } from './__mocks__/discord';

describe('FactionSystemPlugin', () => {
  let plugin: FactionSystemPlugin;
  let mockClient: any;
  let mockWorldState: any;

  beforeEach(() => {
    // Create a fresh instance of the plugin for each test
    plugin = new FactionSystemPlugin();
    
    // Create mock client and world state
    mockClient = createMockClient();
    mockWorldState = {
      // Add any required world state methods here
    };

    // Initialize the plugin
    plugin.onLoad({ client: mockClient, worldState: mockWorldState });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('Faction System');
      expect(plugin.enabled).toBe(true);
    });

    it('should register commands on load', () => {
      expect(Object.keys(plugin.commands)).toContain('faction');
      expect(Object.keys(plugin.commands)).toContain('factions');
    });
  });

  describe('Command Handling', () => {
    it('should respond to help command', async () => {
      const message = createMockMessage('!faction help');
      await plugin.commands.faction(message, ['help']);
      
      // Verify the help message was sent
      expect(message.channel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Faction Commands',
              })
            })
          ]
        })
      );
    });

    it('should show faction info', async () => {
      const message = createMockMessage('!faction info test');
      await plugin.commands.faction(message, ['info', 'test']);
      
      expect(message.channel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Faction Information',
              })
            })
          ]
        })
      );
    });

    it('should list factions', async () => {
      const message = createMockMessage('!factions');
      await plugin.commands.factions(message, []);
      
      expect(message.channel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Factions',
              })
            })
          ]
        })
      );
    });
  });

  describe('Faction Management', () => {
    // Add more test cases for creating, joining, and leaving factions
    it('should handle unknown commands gracefully', async () => {
      const message = createMockMessage('!faction unknown');
      await plugin.commands.faction(message, ['unknown']);
      
      // Should default to showing help
      expect(message.channel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Faction Commands',
              })
            })
          ]
        })
      );
    });
  });
});
