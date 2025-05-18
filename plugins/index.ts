/**
 * Plugin System for Catalyst Discord Bot
 * 
 * Provides a modular architecture for extending bot functionality
 */

import { Client, Message, Interaction, Collection } from 'discord.js';
import { CONFIG } from '../config';
import { WorldStateManager } from '../core/worldState';
import { CatalystPlugin, PluginManager } from './pluginManager';

// Re-export plugin types for convenience
export { CatalystPlugin } from './pluginManager';

export interface Plugin extends Omit<CatalystPlugin, 'onLoad'> {
  enabled: boolean;
  config?: Record<string, any>;
  
  // Override onLoad to include the plugin registry
  onLoad?(registry: PluginRegistry): Promise<void> | void;
  
  // Additional plugin methods
  onUnload?(): Promise<void> | void;
  onMessage?(message: Message): Promise<void> | void;
  onInteraction?(interaction: Interaction): Promise<void> | void;
  onButtonClick?(interaction: any): Promise<void> | void;
  onSlashCommand?(interaction: any): Promise<void> | void;
  onReactionAdd?(reaction: any, user: any): Promise<void> | void;
}

/**
 * Plugin registry - manages loading and unloading of plugins
 */
class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private pluginManager: PluginManager;
  private worldState: WorldStateManager;
  
  constructor() {
    this.worldState = new WorldStateManager();
    this.pluginManager = new PluginManager(this.worldState);
  }
  
  /**
   * Initialize the plugin system
   */
  async initialize(): Promise<void> {
    try {
      // Load all plugins from the plugins directory
      await this.pluginManager.loadAllPlugins();
      
      // Register loaded plugins with our registry
      for (const plugin of this.pluginManager.getAllPlugins()) {
        // Skip already registered plugins
        if (this.plugins.has(plugin.id)) {
          continue;
        }
        
        // Create a wrapper that adapts the plugin to our Plugin interface
        const wrapper: Plugin = {
          ...plugin,
          enabled: true,
          config: {},
          onLoad: async () => {
            if (plugin.onLoad) {
              await plugin.onLoad(this.pluginManager);
            }
          }
        };
        
        // Register the wrapper
        this.plugins.set(plugin.id, wrapper);
      }
      
      console.log('[PluginSystem] Initialized plugin system');
    } catch (error) {
      console.error('[PluginSystem] Failed to initialize plugin system:', error);
      throw error;
    }
  }
  
  /**
   * Get the world state manager
   */
  getWorldState(): WorldStateManager {
    return this.worldState;
  }
  
  /**
   * Get the plugin manager
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }
  
  /**
   * Register a new plugin
   */
  async registerPlugin(plugin: Plugin): Promise<boolean> {
    try {
      // Skip if already registered
      if (this.plugins.has(plugin.id)) {
        console.warn(`[PluginSystem] Plugin ${plugin.id} is already registered`);
        return false;
      }
      
      // Create a wrapper that adapts the plugin to the CatalystPlugin interface
      const wrapper: CatalystPlugin = {
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        author: plugin.author || 'Unknown',
        requires: plugin.requires,
        dependencies: plugin.dependencies,
        
        // Wrap lifecycle methods to maintain context
        onLoad: async (manager: PluginManager) => {
          if (plugin.onLoad) {
            await plugin.onLoad(this);
          }
        },
        
        onUnload: plugin.onUnload,
        onMessage: plugin.onMessage,
        onReactionAdd: plugin.onReactionAdd,
        onButtonClick: plugin.onButtonClick,
        onSlashCommand: plugin.onSlashCommand
      };
      
      // Register with the plugin manager
      await this.pluginManager.loadPlugin(plugin.id);
      
      // Store in our registry
      this.plugins.set(plugin.id, {
        ...wrapper,
        enabled: true,
        config: plugin.config || {}
      });
      
      console.log(`[PluginSystem] Registered plugin: ${plugin.name} v${plugin.version}`);
      return true;
    } catch (error) {
      console.error(`[PluginSystem] Failed to register plugin ${plugin.id}:`, error);
      return false;
    }
  }
  
  /**
   * Unregister a plugin by ID
   */
  async unregisterPlugin(pluginId: string): Promise<boolean> {
    try {
      await this.pluginManager.unloadPlugin(pluginId);
      this.plugins.delete(pluginId);
      console.log(`[PluginSystem] Unregistered plugin: ${pluginId}`);
      return true;
    } catch (error) {
      console.error(`[PluginSystem] Failed to unregister plugin ${pluginId}:`, error);
      return false;
    }
  }
  
  /**
   * Enable a plugin by ID
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`[PluginSystem] Cannot enable non-existent plugin: ${pluginId}`);
      return false;
    }
    
    if (plugin.enabled) {
      return true; // Already enabled
    }
    
    plugin.enabled = true;
    console.log(`[PluginSystem] Enabled plugin: ${plugin.name}`);
    return true;
  }
  
  /**
   * Disable a plugin by ID
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) {
      return false;
    }
    
    plugin.enabled = false;
    console.log(`[PluginSystem] Disabled plugin: ${plugin.name}`);
    return true;
  }
  
  /**
   * Get a plugin by ID
   */
  getPlugin<T extends Plugin = Plugin>(pluginId: string): T | undefined {
    return this.plugins.get(pluginId) as T | undefined;
  }
  
  /**
   * Get all registered plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get all enabled plugins
   */
  getEnabledPlugins(): Plugin[] {
    return this.getAllPlugins().filter(plugin => plugin.enabled);
  }
  
  /**
   * Handle a message event for all enabled plugins
   */
  async handleMessage(message: Message): Promise<void> {
    try {
      await this.pluginManager.emit('message', message);
    } catch (error) {
      console.error('[PluginSystem] Error in handleMessage:', error);
    }
  }
  
  /**
   * Handle an interaction event for all enabled plugins
   */
  async handleInteraction(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isButton()) {
        await this.pluginManager.emit('buttonClick', interaction);
      } else if (interaction.isCommand()) {
        await this.pluginManager.emit('slashCommand', interaction);
      }
    } catch (error) {
      console.error('[PluginSystem] Error in handleInteraction:', error);
    }
  }
  
  /**
   * Handle a reaction add event for all enabled plugins
   */
  async handleReactionAdd(reaction: any, user: any): Promise<void> {
    try {
      await this.pluginManager.emit('reactionAdd', reaction, user);
    } catch (error) {
      console.error('[PluginSystem] Error in handleReactionAdd:', error);
    }
  }
  
  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    // Unload all plugins
    for (const plugin of this.plugins.values()) {
      await this.unregisterPlugin(plugin.id);
    }
    
    // Clean up world state
    await this.worldState.destroy();
  }
}

// Create and export singleton instance
export const pluginRegistry = new PluginRegistry();

// Initialize the plugin system when this module is loaded
pluginRegistry.initialize().catch(error => {
  console.error('Failed to initialize plugin system:', error);
  process.exit(1);
});

// Clean up on process exit
process.on('SIGINT', async () => {
  await pluginRegistry.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pluginRegistry.destroy();
  process.exit(0);
});

export default pluginRegistry;
