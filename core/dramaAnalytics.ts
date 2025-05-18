/**
 * Drama Analytics Core
 * 
 * Handles tension detection, scoring, and narrative structure for Catalyst.
 * Implements metrics for Drama Intensity Score, Instigator Index, and Faction Entropy.
 */

import { Message } from 'discord.js';
import { DramaEvent, DramaEventType } from '../db/models';
import { v4 as uuidv4 } from 'uuid';
import { isTextChannelWithSend } from '../utils/discord-helpers';
import { eventCapture } from './eventCapture';

// Tracking data types
interface MessageData {
  id: string;
  userId: string;
  timestamp: number;
  hasMentions: boolean;
  content: string;
}

/**
 * DramaAnalytics class handles the detection and scoring of dramatic events
 * in a Discord community. It tracks user interactions, message patterns,
 * and conversation dynamics to generate drama events.
 */
export class DramaAnalytics {
  private static instance: DramaAnalytics;

  // Cache for analytics
  private recentMessages: Map<string, MessageData[]> = new Map();
  private dramaScores: Map<string, number> = new Map();

  // Playful event signal patterns
  private eventKeywords = [
    'plot twist', 'showdown', 'aura-off', 'spotlight', 'switch sides', 'hype',
    'creative', 'alliance', 'rival', 'spotlight challenge', 'fun', 'surprise',
    'collab', 'reveal', 'challenge', 'contest', 'event', 'energy', 'vibe'
  ];

  private reactionEmojis = [
    '🔥', '👀', '😱', '🌟', '💥', '⚔️', '🛡️', '👑', '🎭', '🎪',
    '🏆', '🥇', '🌋', '🔪', '☠️', '💣', '💢', '⚡', '🧨'
  ];

  // Private constructor for singleton
  private constructor() {
    // Hook into central event bus
    eventCapture.on('message', (msg) => {
      // Fire & forget, we don't await here to avoid blocking
      this.analyzeMessage(msg).catch(console.error);
    });
  }

  /**
   * Gets the singleton instance of DramaAnalytics
   */
  public static getInstance(): DramaAnalytics {
    if (!DramaAnalytics.instance) {
      DramaAnalytics.instance = new DramaAnalytics();
    }
    return DramaAnalytics.instance;
  }

  /**
   * Analyze a message for drama indicators
   * @param message Discord message to analyze
   * @returns Drama intensity score (0-10)
   */
  public async analyzeMessage(message: Message): Promise<number> {
    if (message.author.bot) return 0; // Ignore bot messages

    let score = 0;

    // Store message data for time-based analysis
    this.trackMessageData(message);

    // Factor 1: Message length (longer messages can indicate emotional investment)
    if (message.content.length > 100) score += 1;
    if (message.content.length > 200) score += 1;
    
    // Factor 2: Capitalization (SHOUTING)
    const contentChars = message.content.split('');
    const upperCaseLetters = contentChars.filter(c => c.match(/[A-Z]/)).length;
    const allLetters = contentChars.filter(c => c.match(/[A-Za-z]/)).length;
    const upperCaseRatio = allLetters > 0 ? upperCaseLetters / allLetters : 0;
    
    if (upperCaseRatio > 0.5 && allLetters > 10) score += 2;
    
    // Factor 3: Punctuation intensity (!!!, ???)
    const exclamationCount = (message.content.match(/!/g) || []).length;
    const questionCount = (message.content.match(/\?/g) || []).length;
    if (exclamationCount > 2) score += 1;
    if (questionCount > 2) score += 1;
    
    // Factor 4: Mentions (tagging people often indicates conflict)
    score += Math.min(3, message.mentions.users.size);
    
    // Factor 5: Reply to another message (potential debate)
    if (message.reference) score += 1;

    // Store the score for this user
    const userId = message.author.id;
    this.dramaScores.set(userId, (this.dramaScores.get(userId) || 0) + score);
    
    return Math.min(10, score);
  }

  /**
   * Track message data for time-based analysis
   * @param message The message to track
   */
  private trackMessageData(message: Message): void {
    const channelId = message.channel.id;
    if (!this.recentMessages.has(channelId)) {
      this.recentMessages.set(channelId, []);
    }
    
    // Add this message to the channel's recent messages
    const messageData: MessageData = {
      id: message.id,
      userId: message.author.id,
      timestamp: message.createdTimestamp,
      hasMentions: message.mentions.users.size > 0 || message.mentions.roles.size > 0,
      content: message.content.substring(0, 50) // store partial content for analysis
    };
    
    // Get the channel's messages and add this one
    const channelMessages = this.recentMessages.get(channelId);
    if (channelMessages) {
      channelMessages.push(messageData);
      
      // Keep only the last 100 messages per channel
      if (channelMessages.length > 100) {
        channelMessages.shift();
      }
      
      this.recentMessages.set(channelId, channelMessages);
    }
  }

  /**
   * Calculate a user's instigator index
   * @param userId User to calculate for
   * @returns Value between 0-1, higher means more drama started
   */
  public async calculateInstigatorIndex(userId: string): Promise<number> {
    // TODO: Implement real DB query to get statistics
    // This would compare drama events started vs. resolved
    return Math.random(); // Placeholder
  }
  
  /**
   * Calculate faction entropy from recent events
   * @returns Entropy score (0-1)
   */
  public async calculateFactionEntropy(): Promise<number> {
    // TODO: Implement faction stability tracking
    // This measures how much faction membership has changed
    return Math.random() * 0.5; // Placeholder
  }

  /**
   * Create a drama event from a detected drama situation
   * @param type The type of drama event
   * @param participants User IDs involved in the drama
   * @param factions Faction IDs involved in the drama
   * @param score The drama intensity score
   * @param trigger What triggered this drama event
   * @param description Human-readable description of the event
   * @returns A structured DramaEvent object
   */
  public createDramaEvent(
    type: DramaEventType,
    participants: string[],
    factions: string[],
    score: number,
    trigger: string,
    description: string
  ): DramaEvent {
    return {
      id: uuidv4(),
      type,
      participants,
      factions,
      trigger,
      description,
      score,
      outcome: '', // Will be filled in when resolved
      resolved: false,
      timestamp: new Date(),
    };
  }

  /**
   * Check if a channel is experiencing high drama
   * @param channelId The Discord channel ID
   * @returns True if the channel has high drama activity
   */
  public isChannelDramatic(channelId: string): boolean {
    const channelMessages = this.recentMessages.get(channelId);
    
    // If not enough messages, not dramatic
    if (!channelMessages || channelMessages.length < 5) return false;
    
    // Check if there are enough recent messages (last 3 minutes)
    const now = Date.now();
    const threeMinutesAgo = now - 3 * 60 * 1000;
    const recentCount = channelMessages.filter(m => m.timestamp > threeMinutesAgo).length;
    
    // If at least 10 messages in the last 3 minutes, it's dramatic
    return recentCount >= 10;
  }

  /**
   * Get the current drama score for a user
   * @param userId The Discord user ID
   * @returns The accumulated drama score
   */
  public getUserDramaScore(userId: string): number {
    return this.dramaScores.get(userId) || 0;
  }
  
  /**
   * Reset the drama score for a user
   * @param userId The Discord user ID
   */
  public resetUserDramaScore(userId: string): void {
    this.dramaScores.set(userId, 0);
  }
}

// Create a singleton instance for the whole app
const dramaAnalytics = DramaAnalytics.getInstance();
export default dramaAnalytics;
