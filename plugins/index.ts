/**
 * Plugin System for Catalyst Discord Bot
 * 
 * Provides a modular architecture for extending bot functionality
 */

import { Client, Message, Interaction } from 'discord.js';
import { CONFIG } from '../config';

// Plugin interface
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  
  // Lifecycle methods
  onLoad?: (client: Client) => Promise<void>;
  onUnload?: () => Promise<void>;
  
  // Event handlers
  onMessage?: (message: Message) => Promise<void>;
  onInteraction?: (interaction: Interaction) => Promise<void>;
  
  // Command registration
  commands?: string[];
  
  // Plugin configuration
  config?: Record<string, any>;
  
  // Allow plugins to have custom properties and methods
  [key: string]: any;
}

// Plugin registry
class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private client: Client | null = null;
  
  constructor() {}
  
  /**
   * Set the Discord client for the plugin system
   */
  setClient(client: Client) {
    this.client = client;
    console.log('Plugin system initialized with Discord client');
  }
  
  /**
   * Register a new plugin
   */
  async registerPlugin(plugin: Plugin): Promise<boolean> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin with ID ${plugin.id} is already registered`);
      return false;
    }
    
    this.plugins.set(plugin.id, plugin);
    console.log(`Registered plugin: ${plugin.name} (${plugin.id}) v${plugin.version}`);
    
    // Initialize plugin if client is available and plugin is enabled
    if (this.client && plugin.enabled && plugin.onLoad) {
      try {
        await plugin.onLoad(this.client);
        console.log(`Loaded plugin: ${plugin.name}`);
      } catch (error) {
        console.error(`Error loading plugin ${plugin.name}:`, error);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Unregister a plugin by ID
   */
  async unregisterPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin with ID ${pluginId} is not registered`);
      return false;
    }
    
    // Call unload handler if available
    if (plugin.onUnload) {
      try {
        await plugin.onUnload();
      } catch (error) {
        console.error(`Error unloading plugin ${plugin.name}:`, error);
      }
    }
    
    this.plugins.delete(pluginId);
    console.log(`Unregistered plugin: ${plugin.name}`);
    return true;
  }
  
  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
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
    return Array.from(this.plugins.values()).filter(plugin => plugin.enabled);
  }
  
  /**
   * Enable a plugin by ID
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin with ID ${pluginId} is not registered`);
      return false;
    }
    
    if (plugin.enabled) {
      console.warn(`Plugin ${plugin.name} is already enabled`);
      return true;
    }
    
    plugin.enabled = true;
    
    // Call load handler if client is available
    if (this.client && plugin.onLoad) {
      try {
        await plugin.onLoad(this.client);
        console.log(`Enabled plugin: ${plugin.name}`);
      } catch (error) {
        console.error(`Error enabling plugin ${plugin.name}:`, error);
        plugin.enabled = false;
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Disable a plugin by ID
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin with ID ${pluginId} is not registered`);
      return false;
    }
    
    if (!plugin.enabled) {
      console.warn(`Plugin ${plugin.name} is already disabled`);
      return true;
    }
    
    // Call unload handler if available
    if (plugin.onUnload) {
      try {
        await plugin.onUnload();
      } catch (error) {
        console.error(`Error disabling plugin ${plugin.name}:`, error);
      }
    }
    
    plugin.enabled = false;
    console.log(`Disabled plugin: ${plugin.name}`);
    return true;
  }
  
  /**
   * Handle a message event for all enabled plugins
   */
  async handleMessage(message: Message): Promise<void> {
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.onMessage) {
        try {
          await plugin.onMessage(message);
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} message handler:`, error);
        }
      }
    }
  }
  
  /**
   * Handle an interaction event for all enabled plugins
   */
  async handleInteraction(interaction: Interaction): Promise<void> {
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.onInteraction) {
        try {
          await plugin.onInteraction(interaction);
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} interaction handler:`, error);
        }
      }
    }
  }
}

// Create and export singleton instance
export const pluginRegistry = new PluginRegistry();

export default pluginRegistry;
