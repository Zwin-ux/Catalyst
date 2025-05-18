import { CatalystPlugin } from '@plugins/pluginManager';
import { WorldStateManager } from '@core/worldState';

/**
 * Example plugin for Catalyst
 * Demonstrates basic plugin structure and functionality
 */
export default class ExamplePlugin implements CatalystPlugin {
  id = 'example-plugin';
  name = 'Example Plugin';
  description = 'A simple example plugin for Catalyst';
  version = '1.0.0';
  author = 'Catalyst Team';
  
  private worldState: WorldStateManager;
  
  constructor(worldState: WorldStateManager) {
    this.worldState = worldState;
  }
  
  async onLoad(manager: any): Promise<void> {
    console.log(`${this.name} v${this.version} loaded!`);
    
    // Register event handlers
    // These will be called by the PluginManager
  }
  
  async onUnload(): Promise<void> {
    console.log(`${this.name} v${this.version} unloaded!`);
    // Clean up any resources
  }
  
  // Example event handlers
  async onMessage(message: any): Promise<void> {
    if (message.content === '!ping') {
      await message.channel.send('Pong! 🏓');
    }
  }
  
  async onButtonClick(interaction: any): Promise<void> {
    if (interaction.customId === 'example_button') {
      await interaction.reply({ content: 'You clicked the example button!', ephemeral: true });
    }
  }
  
  async onReactionAdd(reaction: any, user: any): Promise<void> {
    // Handle reaction adds
  }
  
  async onSlashCommand(interaction: any): Promise<void> {
    // Handle slash commands
  }
}
