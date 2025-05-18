import { Collection, Message, MessageReaction, User as DiscordUser, Interaction, Client } from 'discord.js';
import { join, resolve } from 'path';
import { promises as fs, existsSync } from 'fs';
import { WorldStateManager } from '../core/worldState';
import { Logger } from '../src/utils/logger';
// Use CommonJS __dirname for compatibility
const __dirname = process.cwd();

/**
 * Plugin configuration options
 */
export interface PluginConfig {
  enabled: boolean;
  [key: string]: any;
}

/**
 * Base interface that all plugins must implement
 */
export interface CatalystPlugin<TConfig = any> {
  /** Unique identifier for the plugin */
  readonly id: string;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Description of what the plugin does */
  readonly description: string;
  
  /** Version of the plugin (semver) */
  readonly version: string;
  
  /** Author of the plugin */
  readonly author: string;
  
  /** Minimum required version of Catalyst (semver) */
  readonly requires?: string;
  
  /** Dependencies (plugin IDs) */
  readonly dependencies?: string[];
  
  /** Plugin configuration */
  config?: TConfig;
  
  /**
   * Called when the plugin is loaded
   * @param manager Reference to the plugin manager
   */
  onLoad(manager: PluginManager): Promise<void> | void;
  
  /**
   * Called when the plugin is unloaded
   */
  onUnload?(): Promise<void> | void;
  
  /**
   * Called when a new message is received
   */
  onMessage?(message: Message): Promise<void> | void;
  
  /**
   * Called when a reaction is added
   */
  onReactionAdd?(reaction: MessageReaction, user: DiscordUser): Promise<void> | void;
  
  /**
   * Called when a button is clicked
   */
  onButtonClick?(interaction: Interaction): Promise<void> | void;
  
  /**
   * Called when a slash command is executed
   */
  onSlashCommand?(interaction: Interaction): Promise<void> | void;
  
  /**
   * Called when the bot is ready
   */
  onReady?(client: Client): Promise<void> | void;
  
  /**
   * Called when the bot is shutting down
   */
  onShutdown?(): Promise<void> | void;
}

/**
 * Plugin loading error
 */
export class PluginError extends Error {
  constructor(
    public pluginId: string,
    message: string,
    public cause?: unknown
  ) {
    super(`[${pluginId}] ${message}`);
    this.name = 'PluginError';
  }
}

/**
 * Manages loading and unloading of Catalyst plugins
 */
export class PluginManager {
  private readonly plugins = new Collection<string, CatalystPlugin>();
  private readonly pluginConfigs = new Map<string, PluginConfig>();
  private readonly logger: Logger;
  private readonly worldState: WorldStateManager;
  private readonly pluginsDir: string;
  private configDir: string;
  
  /**
   * Create a new PluginManager
   * @param worldState Reference to the world state manager
   * @param options Plugin manager options
   */
  constructor(
    worldState: WorldStateManager,
    options: {
      pluginsDir?: string;
      configDir?: string;
      logger?: Logger;
    } = {}
  ) {
    this.worldState = worldState;
    this.pluginsDir = options.pluginsDir || join(process.cwd(), 'plugins');
    this.configDir = options.configDir || join(process.cwd(), 'config');
    this.logger = options.logger || new Logger('PluginManager');
    
    // Ensure directories exist
    this.ensureDirectoryExists(this.pluginsDir);
    this.ensureDirectoryExists(this.configDir);
  }
  
  private ensureDirectoryExists(dir: string): void {
    if (!existsSync(dir)) {
      this.logger.warn(`Directory ${dir} does not exist, creating...`);
      fs.mkdir(dir, { recursive: true }).catch(err => {
        this.logger.error(`Failed to create directory ${dir}:`, err);
      });
    }
  }
  
  /**
   * Load all plugins from the plugins directory
   */
  async loadAllPlugins(): Promise<void> {
    try {
      // Ensure plugins directory exists
      await fs.mkdir(this.pluginsDir, { recursive: true });
      
      // Read all plugin directories
      const pluginDirs = (await fs.readdir(this.pluginsDir, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      console.log(`Found ${pluginDirs.length} plugin(s) to load`);
      
      // Load each plugin
      for (const dir of pluginDirs) {
        try {
          await this.loadPlugin(dir);
        } catch (error) {
          console.error(`Failed to load plugin ${dir}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading plugins:', error);
    }
  }
  
  /**
   * Get the configuration for a plugin
   */
  private async getPluginConfig(pluginId: string): Promise<PluginConfig> {
    if (this.pluginConfigs.has(pluginId)) {
      return this.pluginConfigs.get(pluginId)!;
    }
    
    const configPath = join(this.configDir, `${pluginId}.json`);
    
    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData) as PluginConfig;
      this.pluginConfigs.set(pluginId, config);
      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Config file doesn't exist, create a default one
        const defaultConfig: PluginConfig = { enabled: true };
        await this.savePluginConfig(pluginId, defaultConfig);
        return defaultConfig;
      }
      
      this.logger.error(`Failed to load config for plugin ${pluginId}:`, error);
      return { enabled: true }; // Default to enabled if config is invalid
    }
  }
  
  /**
   * Save plugin configuration
   */
  private async savePluginConfig(pluginId: string, config: PluginConfig): Promise<void> {
    this.pluginConfigs.set(pluginId, config);
    const configPath = join(this.configDir, `${pluginId}.json`);
    
    try {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to save config for plugin ${pluginId}:`, error);
      throw new PluginError(pluginId, 'Failed to save config', error);
    }
  }
  
  /**
   * Load a single plugin by its directory name
   * @param pluginDir Name of the plugin directory
   */
  async loadPlugin(pluginDir: string): Promise<CatalystPlugin> {
    const pluginPath = join(this.pluginsDir, pluginDir);
    const pluginModulePath = join(pluginPath, 'dist', 'index.js');
    
    this.logger.debug(`Loading plugin from ${pluginPath}`);
    
    try {
      // Check if the plugin exists
      await fs.access(pluginModulePath);
      
      // Import the plugin
      const pluginModule = await import(pluginModulePath);
      const plugin = pluginModule.default || pluginModule;
      
      // Validate the plugin
      this.validatePlugin(plugin);
      
      // Check for duplicate
      if (this.plugins.has(plugin.id)) {
        throw new PluginError(plugin.id, `Plugin with ID '${plugin.id}' is already loaded`);
      }
      
      // Check dependencies
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!this.plugins.has(dep)) {
            throw new PluginError(plugin.id, `Missing dependency: ${dep}`);
          }
        }
      }
      
      // Load plugin configuration
      const config = await this.getPluginConfig(plugin.id);
      if (!config.enabled) {
        this.logger.info(`Plugin ${plugin.id} is disabled in config`);
        return plugin;
      }
      
      // Initialize the plugin with config
      plugin.config = config;
      
      try {
        this.logger.info(`Initializing plugin: ${plugin.name} v${plugin.version}`);
        await plugin.onLoad?.(this);
        this.plugins.set(plugin.id, plugin);
        this.logger.info(`Successfully loaded plugin: ${plugin.name} v${plugin.version}`);
        return plugin;
      } catch (error) {
        this.logger.error(`Failed to initialize plugin ${plugin.id}:`, error);
        throw new PluginError(plugin.id, 'Plugin initialization failed', error);
      }
    } catch (error) {
      if (error instanceof PluginError) throw error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new PluginError(pluginDir, `Failed to load plugin: ${errorMessage}`, error);
    }
  }
  
  /**
   * Unload a plugin by its ID
   * @param pluginId ID of the plugin to unload
   * @param force Whether to force unload (ignore dependencies)
   */
  async unloadPlugin(pluginId: string, force: boolean = false): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      this.logger.warn(`Plugin ${pluginId} is not loaded`);
      return false;
    }
    
    try {
      // Check if any other plugins depend on this one
      if (!force) {
        const dependents = [];
        for (const [id, p] of this.plugins) {
          if (p.dependencies?.includes(pluginId)) {
            dependents.push(id);
          }
        }
        
        if (dependents.length > 0) {
          throw new PluginError(
            pluginId,
            `Cannot unload: The following plugins depend on this plugin: ${dependents.join(', ')}`
          );
        }
      }
      
      this.logger.info(`Unloading plugin: ${plugin.name} v${plugin.version}`);
      
      // Call unload handler
      try {
        await plugin.onUnload?.();
      } catch (error) {
        this.logger.error(`Error in ${pluginId}.onUnload:`, error);
        if (!force) throw error;
      }
      
      // Remove from collection
      this.plugins.delete(pluginId);
      
      this.logger.info(`Successfully unloaded plugin: ${plugin.name}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to unload plugin ${pluginId}: ${errorMessage}`);
      
      if (error instanceof PluginError) throw error;
      throw new PluginError(pluginId, 'Failed to unload plugin', error);
    }
  }
  
  /**
   * Reload a plugin by its ID
   * @param pluginId ID of the plugin to reload
   */
  async reloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginError(pluginId, 'Plugin not found');
    }
    
    // Get the plugin's directory name from its path
    const pluginPath = require.resolve(pluginId);
    const pluginDir = pluginPath.split(/[\\/]node_modules[\\/]/).pop()?.split(/[\\/]/)[0];
    
    if (!pluginDir) {
      throw new PluginError(pluginId, 'Could not determine plugin directory');
    }
    
    // Unload then load the plugin
    await this.unloadPlugin(pluginId, true);
    await this.loadPlugin(pluginDir);
    
    return true;
  }
  
  /**
   * Get a loaded plugin by its ID
   * @param pluginId ID of the plugin to get
   */
  getPlugin<T extends CatalystPlugin>(pluginId: string): T | undefined {
    return this.plugins.get(pluginId) as T | undefined;
  }
  
  /**
   * Get all loaded plugins
   */
  getAllPlugins(): CatalystPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Forward a message to all plugins that handle it
   * @param event Event name
   * @param args Arguments to pass to the event handler
   */
  async emit(event: 'message', message: Message): Promise<void>;
  async emit(event: 'reactionAdd', reaction: MessageReaction, user: DiscordUser): Promise<void>;
  async emit(event: 'buttonClick' | 'slashCommand', interaction: Interaction): Promise<void>;
  async emit(event: 'ready', client: Client): Promise<void>;
  async emit(event: 'shutdown'): Promise<void>;
  async emit(event: string, ...args: any[]): Promise<void> {
    const plugins = Array.from(this.plugins.values());
    
    for (const plugin of plugins) {
      try {
        switch (event) {
          case 'message':
            if (plugin.onMessage) await plugin.onMessage(args[0]);
            break;
            
          case 'reactionAdd':
            if (plugin.onReactionAdd) await plugin.onReactionAdd(args[0], args[1]);
            break;
            
          case 'buttonClick':
            if (plugin.onButtonClick) await plugin.onButtonClick(args[0]);
            break;
          case 'slashCommand':
            if (plugin.onSlashCommand) await plugin.onSlashCommand(args[0]);
            break;
            
          case 'ready':
            if (plugin.onReady) await plugin.onReady(args[0]);
            break;
            
          case 'shutdown':
            if (plugin.onShutdown) await plugin.onShutdown();
            break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error in plugin ${plugin.id} during ${event}: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined
        );
        
        // Optionally disable the plugin on error
        if (event !== 'shutdown') {
          try {
            await this.unloadPlugin(plugin.id, true);
            this.logger.warn(`Plugin ${plugin.id} has been unloaded due to errors`);
          } catch (unloadError) {
            this.logger.error(`Failed to unload faulty plugin ${plugin.id}:`, unloadError);
          }
        }
      }
    }
    
    // If this was a shutdown event, clear all plugins
    if (event === 'shutdown') {
      this.plugins.clear();
    }
  }
  
  /**
   * Validate that a plugin has all required properties
   */
  private validatePlugin(plugin: any): plugin is CatalystPlugin {
    if (!plugin) {
      throw new PluginError('unknown', 'Plugin is undefined or null');
    }
    
    const requiredProps = ['id', 'name', 'description', 'version', 'author'];
    const missingProps = requiredProps.filter(prop => !(prop in plugin));
    
    if (missingProps.length > 0) {
      throw new PluginError(
        plugin.id || 'unknown',
        `Plugin is missing required properties: ${missingProps.join(', ')}`
      );
    }
    
    // Validate semver for version
    if (!/^\d+\.\d+\.\d+(-[\w-]+(\.[\w-]+)*)?(\+[\w-]+)?$/.test(plugin.version)) {
      this.logger.warn(`Plugin ${plugin.id} has an invalid version format: ${plugin.version}`);
    }
    
    // Validate ID format (alphanumeric + dashes/underscores)
    if (!/^[a-z0-9-_]+$/i.test(plugin.id)) {
      throw new PluginError(
        plugin.id,
        'Plugin ID must only contain alphanumeric characters, dashes, and underscores'
      );
    }
    
    return true;
  }
}

// Export a singleton instance
export const pluginManager = new PluginManager(
  new WorldStateManager(),
  {
    pluginsDir: join(process.cwd(), 'plugins'),
    configDir: join(process.cwd(), 'config')
  }
);

// Handle process termination
process.on('SIGINT', async () => {
  await pluginManager.emit('shutdown');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pluginManager.emit('shutdown');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Don't exit for uncaught exceptions - let the process continue
  // but log the error for debugging
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Same as above - log but don't crash
});
