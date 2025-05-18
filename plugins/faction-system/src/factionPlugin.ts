import { 
  Client, 
  ChatInputCommandInteraction, 
  ButtonBuilder, 
  ActionRowBuilder, 
  EmbedBuilder, 
  Message, 
  MessageComponentInteraction,
  TextChannel,
  GuildMember,
  Role,
  CategoryChannel,
  Collection,
  REST,
  SlashCommandBuilder,
  Routes,
  PermissionFlagsBits,
  ChannelType,
  PermissionResolvable,
  OverwriteResolvable,
  GuildBasedChannel,
  Guild,
  User,
  Events,
  Interaction,
  ButtonInteraction,
  SelectMenuInteraction,
  CommandInteraction
} from 'discord.js';

// Import types
import type { 
  Faction, 
  FactionMember, 
  FactionSystemConfig,
  WorldState,
  Plugin,
  Logger
} from './types';
import { defaultConfig } from './types/config';

// Import utility functions
import { 
  FactionChannelOptions,
  createFactionRole,
  createFactionChannel,
  validateFactionName,
  validateFactionDescription,
  formatFactionList,
  formatFactionInfo,
  hasFactionPermission
} from './utils/factionUtils';

// Import commands and events
import commands from './commands';
import events from './events';

/**
 * Faction System Plugin
 * 
 * Manages factions, their members, and interactions between them.
 * Provides commands for creating, joining, leaving, and managing factions.
 */
export class FactionSystemPlugin implements Plugin {
  // Plugin metadata
  public id = 'faction-system';
  public name = 'Faction System';
  public description = 'A plugin for managing factions in the game';
  public version = '1.0.0';
  public author = 'Catalyst Team';
  public enabled = true;
  public config: FactionSystemConfig;
  public commands: Record<string, (message: Message, args: string[]) => Promise<void>> = {};
  
  private client: Client | null = null;
  private worldState: WorldState | null = null;
  private logger: Logger = console;
  private commandHandlers: Collection<string, any> = new Collection();
  private eventHandlers: Collection<string, any> = new Collection();
  private cooldowns: Collection<string, Collection<string, number>> = new Collection();
  private ready = false;
  
  constructor(config: Partial<FactionSystemConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.logger = this.config.logger || console;
  }

  /**
   * Initialize the plugin
   * @param client Discord.js Client
   * @param worldState WorldState instance for data persistence
   */
  public async initialize(client: Client, worldState: WorldState): Promise<void> {
    this.client = client;
    this.worldState = worldState;
    
    try {
      // Register commands
      await this.registerCommands();
      
      // Register event listeners
      await this.registerEventListeners();
      
      // Set up cooldowns
      this.setupCooldowns();
      
      this.ready = true;
      this.logger.info(`[${this.name}] Plugin initialized successfully`);
    } catch (error) {
      this.logger.error(`[${this.name}] Error initializing plugin:`, error);
      throw error;
    }
  }
  
  /**
   * Called when the plugin is loaded
   */
  public async onLoad(): Promise<void> {
    this.logger.info(`[${this.name}] Plugin loaded`);
  }
  
  /**
   * Called when the plugin is unloaded
   */
  public async onUnload(): Promise<void> {
    this.ready = false;
    this.logger.info(`[${this.name}] Plugin unloaded`);
  }

  /**
   * Register slash commands with Discord
   */
  private async registerCommands(): Promise<void> {
    if (!this.client?.application) {
      throw new Error('Client or application not available');
    }
    
    try {
      const rest = new REST({ version: '10' }).setToken(this.client.token || '');
      const commandData = commands.map(command => command.data.toJSON());
      
      // Register commands globally
      await rest.put(
        Routes.applicationCommands(this.client.application.id),
        { body: commandData }
      );
      
      // Store command handlers
      for (const command of commands) {
        this.commandHandlers.set(command.data.name, command.execute);
      }
      
      this.logger.info(`[${this.name}] Successfully registered ${commands.length} application commands`);
    } catch (error) {
      this.logger.error(`[${this.name}] Error registering commands:`, error);
      throw error;
    }
  }

  /**
   * Register event listeners
   */
  private async registerEventListeners(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not available');
    }
    
    try {
      // Register built-in events
      this.client.on(Events.InteractionCreate, this.handleInteraction.bind(this));
      
      // Register custom events
      for (const event of events) {
        if (event.once) {
          this.client.once(event.name, (...args: any[]) => 
            event.execute(this.client!, this, ...args as [any, ...any[]])
          );
        } else {
          this.client.on(event.name, (...args: any[]) => 
            event.execute(this.client!, this, ...args as [any, ...any[]])
          );
        }
        this.eventHandlers.set(event.name, event.execute);
      }
      
      this.logger.info(`[${this.name}] Successfully registered ${events.length} event listeners`);
    } catch (error) {
      this.logger.error(`[${this.name}] Error registering event listeners:`, error);
      throw error;
    }
  }

  /**
   * Set up cooldowns for commands
   */
  private setupCooldowns(): void {
    // Initialize cooldowns for each command
    for (const command of commands) {
      this.cooldowns.set(command.data.name, new Collection());
    }
  }

  /**
   * Handle interaction events
   */
  private async handleInteraction(interaction: any): Promise<void> {
    if (!interaction.isCommand()) return;

    const command = this.commandHandlers.get(interaction.commandName);
    if (!command) return;

    try {
      await command(interaction, this);
    } catch (error) {
      this.logger.error(`[${this.name}] Error executing command ${interaction.commandName}:`, error);
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: 'There was an error executing this command!', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: 'There was an error executing this command!', 
          ephemeral: true 
        });
      }
    }
  }

  // Implement required Plugin interface methods
  public async onInit(): Promise<void> {
    // Additional initialization if needed
  }

  public async onReady(): Promise<void> {
    // Called when the bot is ready
  }

  public async onDestroy(): Promise<void> {
    // Cleanup when the plugin is destroyed
    this.ready = false;
  }

  public async handleMessage(message: Message): Promise<void> {
    // Handle message events if needed
  }
}

export default new FactionSystemPlugin();
