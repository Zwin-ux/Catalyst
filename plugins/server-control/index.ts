/**
 * Server Control Plugin
 * 
 * Provides radical server manipulation capabilities while maintaining player-driven dynamics
 */

import { Client, Message, EmbedBuilder, Colors, TextChannel, GuildMember, Role, ChannelType, Channel, VoiceChannel, CategoryChannel, Guild, PermissionOverwrites } from 'discord.js';
import { eventCapture } from '../../core/eventCapture';
import { Plugin } from '../index';
import { CONFIG } from '../../config';
import { isTextChannelWithSend } from '../../utils/discord-helpers';
import { supabase } from '../../db';

// Server Control Plugin
const serverControlPlugin: Plugin = {
  id: 'server-control',
  name: 'Server Control',
  description: 'Provides dynamic server manipulation based on drama and faction activity',
  version: '1.0.0',
  enabled: true,
  
  // Plugin state
  config: {
    chaosLevel: 0,
    lastReorganization: Date.now() - 86400000, // Start with a cooldown of 24 hours ago
    reorgCooldown: 86400000, // 24 hours
    maxChannels: 50,
    minChannels: 10,
    factionTerritories: new Map<string, string>() // factionId -> territoryChannelId
  },
  
  // Initialize plugin
  async onLoad(client: Client): Promise<void> {
    console.log('[Server Control] Plugin loaded');
    
    // Create initial server structure
    const guild = client.guilds.cache.first();
    if (!guild) return;
    
    await this.initializeServerStructure(guild);
  },
  
  // Handle messages to detect server manipulation triggers
  async onMessage(message: Message): Promise<void> {
    if (message.author.bot) return;
    
    // Update chaos level based on message activity
    this.updateChaosLevel(message);
    
    // Check if server reorganization is needed
    if (this.shouldReorganizeServer()) {
      await this.reorganizeServer(message.guild);
    }
  },
  
  // Update chaos level based on message activity
  updateChaosLevel(message: Message): void {
    const currentChaos = this.config.chaosLevel || 0;
    
    // Increase chaos for dramatic messages
    const dramaScore = this.calculateDramaScore(message);
    const newChaos = Math.min(100, currentChaos + dramaScore);
    
    // Decrease chaos over time
    const decay = 0.01; // 1% decay per minute
    const timeSinceLast = (Date.now() - (this.config.lastReorganization || 0)) / 60000; // minutes
    const decayedChaos = Math.max(0, newChaos - (newChaos * decay * timeSinceLast));
    
    this.config.chaosLevel = decayedChaos;
    
    console.log(`[Server Control] Chaos level: ${decayedChaos.toFixed(2)}%`);
  },
  
  // Calculate drama score for a message
  calculateDramaScore(message: Message): number {
    let score = 0;
    
    // Check for all caps
    if (message.content === message.content.toUpperCase()) {
      score += 10;
    }
    
    // Count exclamation marks
    score += message.content.split('!').length - 1;
    
    // Check for mentions
    score += message.mentions.users.size * 5;
    
    // Check for keywords
    const dramaKeywords = ['war', 'fight', 'battle', 'attack', 'betray', 'overthrow'];
    score += message.content.toLowerCase().split(' ').filter(word => 
      dramaKeywords.includes(word)
    ).length * 5;
    
    return Math.min(100, score);
  },
  
  // Check if server reorganization is needed
  shouldReorganizeServer(): boolean {
    if (!CONFIG.ENABLE_SERVER_RESTRUCTURING) return false;
    
    const now = Date.now();
    const lastReorg = this.config.lastReorganization || 0;
    const cooldown = this.config.reorgCooldown || 86400000;
    
    // Check cooldown
    if (now - lastReorg < cooldown) return false;
    
    // Check chaos level
    return this.config.chaosLevel >= CONFIG.SERVER_CHAOS_THRESHOLD;
  },
  
  // Reorganize the server based on current state
  async reorganizeServer(guild: Guild): Promise<void> {
    try {
      console.log('[Server Control] Initiating server reorganization...');
      
      // Create faction territories
      await this.createFactionTerritories(guild);
      
      // Restructure role hierarchy
      await this.restructureRoleHierarchy(guild);
      
      // Update channel permissions
      await this.updateChannelPermissions(guild);
      
      // Update chaos level and reset timer
      this.config.chaosLevel = 0;
      this.config.lastReorganization = Date.now();
      
      console.log('[Server Control] Server reorganization complete');
      
      // Announce reorganization
      const generalChannel = guild.channels.cache.find(c => 
        c.isTextBased() && 'name' in c && c.name === 'general'
      ) as TextChannel | undefined;
      
      if (generalChannel && isTextChannelWithSend(generalChannel)) {
        await generalChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('⚡ Server Restructuring Complete')
              .setDescription('The server has been reorganized based on current faction dynamics and drama levels.')
              .setColor(Colors.Gold)
              .addFields(
                { name: 'New Features:', value: '• Faction territories\n• Updated role hierarchy\n• Dynamic channel permissions' }
              )
              .setFooter({ text: 'Server will reorganize again when drama levels reach critical point' })
              .setTimestamp()
          ]
        });
      }
    } catch (error) {
      console.error('[Server Control] Error during server reorganization:', error);
    }
  },
  
  // Create faction territories
  async createFactionTerritories(guild: Guild): Promise<void> {
    // Get all factions from database
    const { data: factions, error: factionsError } = await supabase
      .from('factions')
      .select('*')
      .order('power', { ascending: false });
    
    if (factionsError) {
      console.error('[Server Control] Error fetching factions:', factionsError);
      return;
    }
    
    // Create territory category if it doesn't exist
    let territoryCategory = guild.channels.cache.find(c => 
      c.type === ChannelType.GuildCategory && c.name === 'FACTION TERRITORIES'
    ) as CategoryChannel | undefined;
    
    if (!territoryCategory) {
      territoryCategory = await guild.channels.create({
        name: 'FACTION TERRITORIES',
        type: ChannelType.GuildCategory,
        reason: 'Server reorganization - creating faction territories'
      });
    }
    
    // Create or update territory channels for each faction
    for (const faction of factions || []) {
      // Check if faction already has a territory
      let territoryChannel = guild.channels.cache.find(c => 
        c.isTextBased() && 'name' in c && c.name === `territory-${faction.name.toLowerCase().replace(/\s+/g, '-')}`
      ) as TextChannel | undefined;
      
      if (!territoryChannel) {
        territoryChannel = await guild.channels.create({
          name: `territory-${faction.name.toLowerCase().replace(/\s+/g, '-')}`,
          type: ChannelType.GuildText,
          parent: territoryCategory,
          reason: `Creating territory for ${faction.name}`,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: ['ViewChannel']
            },
            {
              id: faction.roleId, // This would need to be stored in the database
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
            }
          ]
        });
      }
      
      // Store territory mapping
      this.config.factionTerritories.set(faction.id, territoryChannel?.id || '');
    }
  },
  
  // Restructure role hierarchy
  async restructureRoleHierarchy(guild: Guild): Promise<void> {
    // Get all factions and their power levels
    const { data: factions, error: factionsError } = await supabase
      .from('factions')
      .select('*')
      .order('power', { ascending: false });
    
    if (factionsError) {
      console.error('[Server Control] Error fetching factions:', factionsError);
      return;
    }
    
    // Get all faction roles
    const factionRoles = guild.roles.cache.filter(role => 
      role.name.startsWith('faction-')
    );
    
    // Calculate new positions
    let position = guild.roles.highest.position - 1;
    
    for (const faction of factions || []) {
      const role = factionRoles.find(r => r.name === `faction-${faction.name}`);
      if (role) {
        await role.setPosition(position);
        position--;
      }
    }
  },
  
  // Update channel permissions
  async updateChannelPermissions(guild: Guild): Promise<void> {
    // Get all channels
    const channels = guild.channels.cache.filter(c => 
      c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice
    );
    
    // Update permissions based on faction territories
    for (const [factionId, territoryId] of this.config.factionTerritories) {
      const territoryChannel = channels.get(territoryId);
      if (!territoryChannel) continue;
      
      // Get faction role
      const factionRole = guild.roles.cache.find(r => 
        r.name.startsWith('faction-')
      );
      
      if (factionRole) {
        // Update territory permissions
        await territoryChannel.permissionOverwrites.edit(factionRole, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
        
        // Update other channels' permissions
        for (const channel of channels.values()) {
          if (channel.id !== territoryId) {
            await channel.permissionOverwrites.edit(factionRole, {
              ViewChannel: false,
              SendMessages: false,
              ReadMessageHistory: false
            });
          }
        }
      }
    }
  },
  
  // Initialize server structure
  async initializeServerStructure(guild: Guild): Promise<void> {
    try {
      // Create essential categories
      const categories = [
        { name: 'FACTION TERRITORIES', position: 0 },
        { name: 'PUBLIC CHANNELS', position: 1 },
        { name: 'PRIVATE CHANNELS', position: 2 }
      ];
      
      for (const category of categories) {
        const existing = guild.channels.cache.find(c => 
          c.type === ChannelType.GuildCategory && c.name === category.name
        );
        
        if (!existing) {
          await guild.channels.create({
            name: category.name,
            type: ChannelType.GuildCategory,
            position: category.position,
            reason: 'Server initialization'
          });
        }
      }
      
      // Create essential channels
      const essentialChannels = [
        { name: 'general', category: 'PUBLIC CHANNELS' },
        { name: 'rules', category: 'PUBLIC CHANNELS' },
        { name: 'announcements', category: 'PUBLIC CHANNELS' },
        { name: 'timeline', category: 'PUBLIC CHANNELS' },
        { name: 'recruitment', category: 'PUBLIC CHANNELS' }
      ];
      
      for (const channel of essentialChannels) {
        const existing = guild.channels.cache.find(c => 
          c.isTextBased() && 'name' in c && c.name === channel.name
        );
        
        if (!existing) {
          const category = guild.channels.cache.find(c => 
            c.type === ChannelType.GuildCategory && c.name === channel.category
          );
          
          if (category) {
            await guild.channels.create({
              name: channel.name,
              type: ChannelType.GuildText,
              parent: category,
              reason: 'Server initialization'
            });
          }
        }
      }
      
      console.log('[Server Control] Server structure initialized');
    } catch (error) {
      console.error('[Server Control] Error initializing server structure:', error);
    }
  }
};

// Event bus-driven: subscribe to message events globally
// This allows server control to react to drama/faction events regardless of pluginManager wiring
// (for consistency with other event-driven plugins)
eventCapture.on('message', async (msg: Message) => {
  // Only process if plugin is enabled
  if (serverControlPlugin.enabled && typeof serverControlPlugin.onMessage === 'function') {
    await serverControlPlugin.onMessage(msg);
  }
});

export default serverControlPlugin;
