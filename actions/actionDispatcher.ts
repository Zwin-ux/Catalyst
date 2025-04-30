/**
 * Action Dispatcher
 * 
 * Creates game effects, changes channels, updates roles, etc.
 * The system that translates drama events into tangible Discord changes.
 */

import { 
  Client, 
  TextChannel, 
  VoiceChannel, 
  StageChannel,
  Guild,
  GuildMember,
  Role,
  PermissionsBitField,
  ColorResolvable,
  Colors
} from 'discord.js';
import { DramaEvent } from '../types';

/**
 * Special mode configuration
 */
interface SpecialModeConfig {
  enabled: boolean;
  duration: number; // in milliseconds
  targetChannelId?: string;
  targetUserId?: string;
  startTime?: number;
}

/**
 * Action Dispatcher translates drama events into Discord actions
 */
export class ActionDispatcher {
  private client: Client;
  private activeModes: Map<string, SpecialModeConfig> = new Map();
  
  constructor(client: Client) {
    this.client = client;
    this.setupTimers();
  }
  
  /**
   * Setup timers for checking active modes
   */
  private setupTimers(): void {
    // Check for expired modes every minute
    setInterval(() => this.checkActiveModes(), 60 * 1000);
  }
  
  /**
   * Check for expired special modes and disable them
   */
  private checkActiveModes(): void {
    const now = Date.now();
    
    for (const [modeId, config] of this.activeModes.entries()) {
      if (config.startTime && (now - config.startTime > config.duration)) {
        // Mode expired
        this.disableSpecialMode(modeId);
      }
    }
  }
  
  // ===== CHANNEL DYNAMICS =====
  
  /**
   * Rename a channel based on faction dominance
   * @param channelId Channel to rename
   * @param newName New channel name
   * @param reason Reason for renaming
   */
  async renameChannel(channelId: string, newName: string, reason: string = 'Drama event'): Promise<boolean> {
    const channel = await this.client.channels.fetch(channelId) as TextChannel;
    if (!channel || !channel.guild) return false;
    
    try {
      await channel.setName(newName, reason);
      return true;
    } catch (error) {
      console.error('Failed to rename channel:', error);
      return false;
    }
  }
  
  /**
   * Convert a voice channel to stage channel if high traffic
   * @param voiceChannelId Voice channel ID
   */
  async convertToStage(voiceChannelId: string): Promise<boolean> {
    const channel = await this.client.channels.fetch(voiceChannelId) as VoiceChannel;
    if (!channel || !channel.guild) return false;
    
    try {
      // Can't directly convert, so create new and delete old
      const stageChannel = await channel.guild.channels.create({
        name: channel.name,
        type: 13, // StageChannel type
        parent: channel.parent,
        permissionOverwrites: channel.permissionOverwrites.cache
      });
      
      await channel.delete('Converted to stage channel due to high traffic');
      return true;
    } catch (error) {
      console.error('Failed to convert to stage:', error);
      return false;
    }
  }
  
  /**
   * Set slowmode on a channel based on drama rating
   * @param channelId Channel ID
   * @param dramaRating Drama intensity (0-10)
   */
  async setSlowmode(channelId: string, dramaRating: number): Promise<boolean> {
    const channel = await this.client.channels.fetch(channelId) as TextChannel;
    if (!channel) return false;
    
    // Scale slowmode based on drama rating
    // 0 = no slowmode, 10 = 30 seconds
    const slowmodeSeconds = Math.floor(dramaRating * 3);
    
    try {
      await channel.setRateLimitPerUser(slowmodeSeconds);
      return true;
    } catch (error) {
      console.error('Failed to set slowmode:', error);
      return false;
    }
  }
  
  /**
   * Lock a channel temporarily
   * @param channelId Channel ID
   * @param durationMs Duration in milliseconds
   * @param reason Reason for locking
   */
  async lockChannel(channelId: string, durationMs: number = 5 * 60 * 1000, reason: string = 'Drama cooling period'): Promise<boolean> {
    const channel = await this.client.channels.fetch(channelId) as TextChannel;
    if (!channel) return false;
    
    try {
      // Store original permissions to restore later
      const originalPerms = channel.permissionOverwrites.cache.clone();
      
      // Lock channel by denying send messages to everyone
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        SendMessages: false
      }, { reason });
      
      // Set timeout to unlock
      setTimeout(async () => {
        try {
          // Reset to original permissions
          await channel.permissionOverwrites.set(originalPerms, 'Drama cooling period ended');
        } catch (e) {
          console.error('Failed to unlock channel:', e);
        }
      }, durationMs);
      
      return true;
    } catch (error) {
      console.error('Failed to lock channel:', error);
      return false;
    }
  }
  
  // ===== POWERS =====
  
  /**
   * Auto-mute a user with low karma
   * @param userId User ID to mute
   * @param guildId Guild ID
   * @param durationMs Duration in milliseconds
   */
  async autoMuteUser(userId: string, guildId: string, durationMs: number = 10 * 60 * 1000): Promise<boolean> {
    const guild = await this.client.guilds.fetch(guildId);
    if (!guild) return false;
    
    try {
      const member = await guild.members.fetch(userId);
      if (!member) return false;
      
      await member.timeout(durationMs, 'Auto-muted due to low karma');
      return true;
    } catch (error) {
      console.error('Failed to auto-mute user:', error);
      return false;
    }
  }
  
  /**
   * Create an ephemeral drama channel
   * @param guildId Guild ID
   * @param dramaTopic Topic of drama
   * @param participantIds User IDs involved
   * @param durationMs How long the channel should exist
   */
  async createDramaChannel(guildId: string, dramaTopic: string, participantIds: string[], durationMs: number = 60 * 60 * 1000): Promise<string | null> {
    const guild = await this.client.guilds.fetch(guildId);
    if (!guild) return null;
    
    try {
      // Create channel
      const channel = await guild.channels.create({
        name: `drama-${dramaTopic.toLowerCase().replace(/\s+/g, '-')}`,
        type: 0, // Text channel
        topic: `Drama: ${dramaTopic} | Auto-deletes in ${durationMs / (60 * 1000)} minutes`
      });
      
      // Ping participants
      const mentions = participantIds.map(id => `<@${id}>`).join(' ');
      await channel.send(`Drama detected! ${mentions} are involved in this discussion.`);
      
      // Schedule deletion
      setTimeout(async () => {
        try {
          await channel.delete('Ephemeral drama channel expired');
        } catch (e) {
          console.error('Failed to delete drama channel:', e);
        }
      }, durationMs);
      
      return channel.id;
    } catch (error) {
      console.error('Failed to create drama channel:', error);
      return null;
    }
  }
  
  // ===== SPECIAL MODES =====
  
  /**
   * Activate Trial by Drama mode
   * @param channelId Channel to activate in
   * @param targetUserId User on trial
   * @param accusation What they're accused of
   * @param durationMs How long to run the trial
   */
  async activateTrialByDrama(channelId: string, targetUserId: string, accusation: string, durationMs: number = 30 * 60 * 1000): Promise<boolean> {
    const channel = await this.client.channels.fetch(channelId) as TextChannel;
    if (!channel) return false;
    
    try {
      const targetMember = await channel.guild.members.fetch(targetUserId);
      if (!targetMember) return false;
      
      // Create special mode config
      this.activeModes.set('trial', {
        enabled: true,
        duration: durationMs,
        targetChannelId: channelId,
        targetUserId,
        startTime: Date.now()
      });
      
      // Announce trial
      await channel.send({
        embeds: [{
          title: '⚖️ Trial by Drama!',
          description: `${targetMember.displayName} stands accused of ${accusation}! Vote with 👍 or 👎 to decide their fate!`,
          color: Colors.Orange,
          fields: [{
            name: 'Time Remaining',
            value: `This trial will conclude in ${durationMs / (60 * 1000)} minutes`
          }],
          footer: { text: 'Trial by Drama | Catalyst Drama Engine' }
        }]
      });
      
      return true;
    } catch (error) {
      console.error('Failed to activate Trial by Drama:', error);
      return false;
    }
  }
  
  /**
   * Activate Crisis Mode (limit speech to one channel)
   * @param guildId Guild ID
   * @param crisisChannelId Main crisis channel
   * @param reason Reason for crisis
   * @param durationMs How long to maintain crisis
   */
  async activateCrisisMode(guildId: string, crisisChannelId: string, reason: string, durationMs: number = 30 * 60 * 1000): Promise<boolean> {
    const guild = await this.client.guilds.fetch(guildId);
    if (!guild) return false;
    
    try {
      // Create special mode config
      this.activeModes.set('crisis', {
        enabled: true,
        duration: durationMs,
        targetChannelId: crisisChannelId,
        startTime: Date.now()
      });
      
      // Lock all text channels except crisis channel
      const textChannels = guild.channels.cache.filter(
        channel => channel.isTextBased() && channel.id !== crisisChannelId
      );
      
      for (const [_, channel] of textChannels) {
        await (channel as TextChannel).permissionOverwrites.edit(
          guild.roles.everyone,
          { SendMessages: false },
          { reason: `Crisis Mode: ${reason}` }
        );
      }
      
      // Announce crisis
      const crisisChannel = await this.client.channels.fetch(crisisChannelId) as TextChannel;
      await crisisChannel.send({
        embeds: [{
          title: '🚨 Crisis Mode Activated!',
          description: `${reason}\n\nAll communication is limited to this channel for ${durationMs / (60 * 1000)} minutes.`,
          color: Colors.Red,
          footer: { text: 'Crisis Mode | Catalyst Drama Engine' }
        }]
      });
      
      return true;
    } catch (error) {
      console.error('Failed to activate Crisis Mode:', error);
      return false;
    }
  }
  
  /**
   * Disable a special mode
   * @param modeId Mode ID to disable
   */
  private async disableSpecialMode(modeId: string): Promise<void> {
    const config = this.activeModes.get(modeId);
    if (!config || !config.enabled) return;
    
    try {
      switch (modeId) {
        case 'trial':
          await this.endTrialByDrama(config);
          break;
        case 'crisis':
          await this.endCrisisMode(config);
          break;
        // Add other modes here
      }
      
      // Remove from active modes
      this.activeModes.delete(modeId);
    } catch (error) {
      console.error(`Failed to disable ${modeId} mode:`, error);
    }
  }
  
  /**
   * End a Trial by Drama
   */
  private async endTrialByDrama(config: SpecialModeConfig): Promise<void> {
    if (!config.targetChannelId) return;
    
    const channel = await this.client.channels.fetch(config.targetChannelId) as TextChannel;
    if (!channel) return;
    
    // Find the trial message and count votes
    const messages = await channel.messages.fetch({ limit: 100 });
    const trialMessage = messages.find(m => 
      m.embeds.length > 0 && 
      m.embeds[0].title?.includes('Trial by Drama') &&
      m.embeds[0].description?.includes(config.targetUserId || '')
    );
    
    if (trialMessage) {
      const upvotes = trialMessage.reactions.cache.get('👍')?.count || 0;
      const downvotes = trialMessage.reactions.cache.get('👎')?.count || 0;
      const verdict = upvotes > downvotes ? 'INNOCENT' : 'GUILTY';
      
      // Announce result
      await channel.send({
        embeds: [{
          title: `Trial of <@${config.targetUserId}> Concluded`,
          description: `The verdict is: **${verdict}**\n\nVotes: 👍 ${upvotes} | 👎 ${downvotes}`,
          color: verdict === 'INNOCENT' ? Colors.Green : Colors.Red,
          footer: { text: 'Trial by Drama | Catalyst Drama Engine' }
        }]
      });
      
      // If guilty, timeout the user
      if (verdict === 'GUILTY' && config.targetUserId) {
        const member = await channel.guild.members.fetch(config.targetUserId);
        if (member) {
          await member.timeout(10 * 60 * 1000, 'Found guilty in Trial by Drama');
        }
      }
    }
  }
  
  /**
   * End Crisis Mode
   */
  private async endCrisisMode(config: SpecialModeConfig): Promise<void> {
    if (!config.targetChannelId) return;
    
    const channel = await this.client.channels.fetch(config.targetChannelId) as TextChannel;
    if (!channel) return;
    
    const guild = channel.guild;
    
    // Unlock all text channels
    const textChannels = guild.channels.cache.filter(channel => channel.isTextBased());
    
    for (const [_, channel] of textChannels) {
      await (channel as TextChannel).permissionOverwrites.edit(
        guild.roles.everyone,
        { SendMessages: null },
        { reason: 'Crisis Mode ended' }
      );
    }
    
    // Announce end of crisis
    await channel.send({
      embeds: [{
        title: '✅ Crisis Mode Deactivated',
        description: 'Normal communications have been restored across all channels.',
        color: Colors.Green,
        footer: { text: 'Crisis Mode | Catalyst Drama Engine' }
      }]
    });
  }
}

export default (client: Client) => new ActionDispatcher(client);
