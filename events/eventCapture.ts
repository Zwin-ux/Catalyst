/**
 * Event Capture Engine
 * 
 * Passively monitors Discord activity to detect drama and faction dynamics.
 * Captures signals like emoji spread, high-velocity threads, repeat callouts,
 * mentions, and voice channel activity.
 */

import { 
  Client, 
  Message, 
  MessageReaction,
  PartialMessageReaction,
  VoiceState,
  TextChannel, 
  GuildMember, 
  User as DiscordUser,
  PartialUser,
  Guild,
  Partials
} from 'discord.js';
// Imported correctly now that we've fixed the export
import dramaAnalytics from '../core/dramaAnalytics';
import factionSystem from '../core/factionSystem';
import { DramaEventType } from '../types';

// Buffer cache for recent events (rolling window)
interface EventBuffer {
  messages: Message[];
  reactions: {reaction: MessageReaction, user: DiscordUser}[];
  voiceEvents: VoiceState[];
  mentionEvents: {message: Message, mentions: DiscordUser[]}[];
}

export class EventCaptureEngine {
  private client: Client;
  private buffer: EventBuffer = {
    messages: [],
    reactions: [],
    voiceEvents: [],
    mentionEvents: []
  };
  
  // Maximum buffer sizes
  private readonly MAX_MESSAGES = 1000;
  private readonly MAX_REACTIONS = 500;
  private readonly MAX_VOICE_EVENTS = 200;
  private readonly MAX_MENTION_EVENTS = 200;
  
  constructor(client: Client) {
    this.client = client;
    this.setupEventListeners();
  }
  
  /**
   * Register all event handlers for the Discord client
   */
  private setupEventListeners(): void {
    // Message creation events
    this.client.on('messageCreate', this.handleMessageCreate.bind(this));
    
    // Reaction events - update signatures to match Discord.js expectations
    this.client.on('messageReactionAdd', async (reaction, user, _details) => {
      await this.handleReactionAdd(reaction, user);
    });
    
    this.client.on('messageReactionRemove', async (reaction, user, _details) => {
      await this.handleReactionRemove(reaction, user);
    });
    
    // Voice state updates
    this.client.on('voiceStateUpdate', this.handleVoiceStateUpdate.bind(this));
  }
  
  /**
   * Handle new messages and analyze for drama indicators
   */
  private async handleMessageCreate(message: Message): Promise<void> {
    // Skip bot messages
    if (message.author.bot) return;
    
    // Add to buffer
    this.buffer.messages.push(message);
    if (this.buffer.messages.length > this.MAX_MESSAGES) {
      this.buffer.messages.shift();
    }
    
    // Track mentions
    if (message.mentions.users.size > 0) {
      this.buffer.mentionEvents.push({
        message,
        mentions: Array.from(message.mentions.users.values())
      });
      
      if (this.buffer.mentionEvents.length > this.MAX_MENTION_EVENTS) {
        this.buffer.mentionEvents.shift();
      }
    }
    
    // Analyze for drama
    const dramaScore = await dramaAnalytics.analyzeMessage(message);
    
    // If drama score is high, trigger further analysis
    if (dramaScore > 5) {
      await this.processDramaticMessage(message, dramaScore);
    }
    
    // Check for high-velocity threads
    await this.detectHighVelocityThread(message);
    
    // Auto-suggest faction if user isn't in one
    const userId = message.author.id;
    const userFaction = factionSystem.getUserFaction(userId);
    if (!userFaction) {
      const suggestedFactionId = await factionSystem.suggestFaction(userId);
      if (suggestedFactionId) {
        // Could send a DM here suggesting they join a faction
      }
    }
  }
  
  /**
   * Handle reaction add events
   */
  private async handleReactionAdd(reaction: MessageReaction | PartialMessageReaction, user: DiscordUser | PartialUser): Promise<void> {
    // Skip bot reactions
    if (user.bot) return;
    
    // Ensure reaction is fully fetched
    if (reaction.partial) {
      try {
        reaction = await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }
    
    // Add to buffer
    this.buffer.reactions.push({reaction: reaction as MessageReaction, user: user as DiscordUser});
    if (this.buffer.reactions.length > this.MAX_REACTIONS) {
      this.buffer.reactions.shift();
    }
    
    // Analyze for split votes and emoji patterns
    await this.analyzeReactionPatterns(reaction.message.id);
  }
  
  /**
   * Handle reaction remove events
   */
  private async handleReactionRemove(reaction: MessageReaction | PartialMessageReaction, user: DiscordUser | PartialUser): Promise<void> {
    // Skip bot reactions
    if (user.bot) return;
    
    // Ensure reaction is fully fetched
    if (reaction.partial) {
      try {
        reaction = await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }
    
    // We don't buffer removes, but we do re-analyze patterns
    await this.analyzeReactionPatterns(reaction.message.id);
  }
  
  /**
   * Handle voice state updates (joins, leaves, mutes, etc.)
   */
  private async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    // Skip bot voice events
    if (newState.member?.user.bot) return;
    
    // Add to buffer
    this.buffer.voiceEvents.push(newState);
    if (this.buffer.voiceEvents.length > this.MAX_VOICE_EVENTS) {
      this.buffer.voiceEvents.shift();
    }
    
    // Detect rage quits (leaving shortly after another user joins)
    if (oldState.channelId && !newState.channelId) {
      await this.detectRageQuit(oldState);
    }
    
    // Detect voice channel floods (many users joining at once)
    if (!oldState.channelId && newState.channelId) {
      await this.detectVoiceChannelFlood(newState.channelId);
    }
  }
  
  /**
   * Process a message with high drama score
   */
  private async processDramaticMessage(message: Message, score: number): Promise<void> {
    // Add drama points to user
    // TODO: Update this when world state system is implemented
    console.log(`High drama detected in message from ${message.author.username}: ${score}`);
    
    // Could create a drama event here to feed into the timeline
  }
  
  /**
   * Detect high-velocity thread (many messages in short time)
   */
  private async detectHighVelocityThread(message: Message): Promise<void> {
    if (!message.reference) return;
    
    // Find all messages in the thread from the buffer
    const threadMessages = this.buffer.messages.filter(m => 
      m.reference && m.reference.messageId === message.reference!.messageId);
    
    // If many messages in a short time, this is high velocity
    if (threadMessages.length >= 5) {
      const oldestTimestamp = Math.min(...threadMessages.map(m => m.createdTimestamp));
      const newestTimestamp = Math.max(...threadMessages.map(m => m.createdTimestamp));
      const timeSpanMinutes = (newestTimestamp - oldestTimestamp) / (1000 * 60);
      
      // If 5+ messages in less than 2 minutes, it's high velocity
      if (timeSpanMinutes < 2) {
        console.log(`High velocity thread detected: ${threadMessages.length} messages in ${timeSpanMinutes.toFixed(1)} minutes`);
        // Could create a drama event here
      }
    }
  }
  
  /**
   * Analyze reaction patterns on a message
   */
  private async analyzeReactionPatterns(messageId: string): Promise<void> {
    // Get all reactions for this message
    const messageReactions = this.buffer.reactions.filter(r => 
      r.reaction.message.id === messageId);
    
    // Count unique emojis
    const emojiCounts = new Map<string, number>();
    for (const {reaction} of messageReactions) {
      const emojiName = reaction.emoji.name || 'unknown';
      emojiCounts.set(emojiName, (emojiCounts.get(emojiName) || 0) + 1);
    }
    
    // Split vote detection (approximately equal opposing reactions)
    if (emojiCounts.size >= 2) {
      const counts = Array.from(emojiCounts.values());
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      
      // If largest reaction count is within 20% of smallest, it's a split vote
      if (min > 3 && min / max > 0.8) {
        console.log(`Split vote detected on message ${messageId}`);
        // Could create a drama event here
      }
    }
    
    // Sarcasm emoji detection (🙄, 🤔, 😏, etc.)
    const sarcasmEmojis = ['🙄', '🤔', '😏', '👀', '💅'];
    const hasSarcasm = Array.from(emojiCounts.keys()).some(emoji => 
      sarcasmEmojis.includes(emoji) && (emojiCounts.get(emoji) || 0) > 2);
    
    if (hasSarcasm) {
      console.log(`Sarcasm emoji pattern detected on message ${messageId}`);
      // Could create a drama event here
    }
  }
  
  /**
   * Detect rage quit (user leaving shortly after another joins)
   */
  private async detectRageQuit(state: VoiceState): Promise<void> {
    if (!state.channel) return;
    
    // Get recent joins to this channel
    const now = Date.now();
    const recentJoins = this.buffer.voiceEvents.filter(v => 
      v.channelId === state.channelId && 
      v.member?.id !== state.member?.id &&
      // Voice states don't have createdTimestamp, so we'll use our buffer timestamp
      // We'll assume the order of events in the buffer roughly matches time order
      this.buffer.voiceEvents.indexOf(v) > this.buffer.voiceEvents.length - 10); // Last few voice events
    
    if (recentJoins.length > 0) {
      console.log(`Possible rage quit by ${state.member?.user.username} after ${recentJoins.length} users joined`);
      // Could create a drama event here
    }
  }
  
  /**
   * Detect voice channel flood (many users joining at once)
   */
  private async detectVoiceChannelFlood(channelId: string): Promise<void> {
    // Get all joins to this channel (recent in the buffer)
    const recentJoins = this.buffer.voiceEvents.filter(v => 
      v.channelId === channelId);
    
    // Limit to only the most recent events based on buffer position
    const recentCount = Math.min(recentJoins.length, 10); // Last 10 events
    const veryRecentJoins = recentJoins.slice(-recentCount);
    
    if (veryRecentJoins.length >= 4) {
      console.log(`Voice channel flood detected: ${veryRecentJoins.length} users joined recently`);
      // Could create a drama event here
    }
  }
  
  /**
   * Get recent messages for a user
   */
  public getRecentUserMessages(userId: string, limit: number = 10): Message[] {
    return this.buffer.messages
      .filter(m => m.author.id === userId)
      .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
      .slice(0, limit);
  }
  
  /**
   * Get recent mentions of a user
   */
  public getRecentUserMentions(userId: string, limit: number = 10): Message[] {
    return this.buffer.mentionEvents
      .filter(e => e.mentions.some(u => u.id === userId))
      .map(e => e.message)
      .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
      .slice(0, limit);
  }
}

/**
 * Initialize event handlers for the Discord client
 */
export function registerEventHandlers(client: Client): void {
  new EventCaptureEngine(client);
  console.log('Event capture engine initialized');
}
