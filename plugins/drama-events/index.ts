/**
 * Drama Events Plugin
 * 
 * Adds special drama events that can be triggered based on server activity
 */

import { Client, Message, TextChannel, EmbedBuilder, Colors, ColorResolvable } from 'discord.js';
import { eventCapture } from '../../core/eventCapture';
import { Plugin } from '../index';
import { isTextChannelWithSend } from '../../utils/discord-helpers';

// Drama event types and their keywords
const DRAMA_KEYWORDS = {
  'betrayal': ['betray', 'traitor', 'backstab', 'double cross'],
  'alliance': ['ally', 'team up', 'join forces', 'work together'],
  'treachery': ['treachery', 'deceit', 'betrayal', 'double-cross'],
  'revelation': ['secret', 'reveal', 'truth', 'discover']
} as const;
import { CONFIG } from '../../config';

// Drama event types
const DRAMA_EVENTS = [
  {
    id: 'faction_war',
    name: 'Faction War',
    description: 'A conflict between two factions has escalated into open warfare!',
    color: Colors.Red,
    image: 'https://cdn.pixabay.com/photo/2016/03/31/19/14/crown-1294906_1280.png',
    points: 10
  },
  {
    id: 'betrayal',
    name: 'Betrayal',
    description: 'A faction member has betrayed their allies!',
  },
  {
    id: 'alliance',
    name: 'Unlikely Alliance',
    description: 'Former rivals have joined forces!',
    color: 0x9b59b6, // Purple
    image: 'https://i.imgur.com/ABCD5678.png',
    points: 30,
    keywords: DRAMA_KEYWORDS.alliance
  },
  {
    id: 'treachery',
    name: 'Treachery Afoot',
    description: 'Someone is not who they seem...',
    color: 0xe67e22, // Orange
    image: 'https://i.imgur.com/EFGH9012.png',
    points: 40,
    keywords: DRAMA_KEYWORDS.treachery
  },
  {
    id: 'revelation',
    name: 'Shocking Revelation',
    description: 'A long-buried secret comes to light!',
    color: 0x3498db, // Blue
    image: 'https://i.imgur.com/IJKL3456.png',
    points: 35,
    keywords: DRAMA_KEYWORDS.revelation
  }
];

// Track last event time to prevent spam
let lastEventTime = Date.now() - 3600000; // Start with a cooldown of 1 hour ago

// Helper function to trigger a drama event
async function triggerDramaEvent(message: Message, eventType: string, config: any): Promise<void> {
  const event = DRAMA_EVENTS.find(e => e.id === eventType);
  if (!event) return;
  
  // Find the announcement channel
  const channel = message.guild?.channels.cache.find(c => 
    c.isTextBased() && 'name' in c && c.name === (config?.announcementChannel || 'timeline')
  ) as TextChannel | undefined;
  
  if (channel && isTextChannelWithSend(channel)) {
    // Create the event embed
    const embed = new EmbedBuilder()
      .setTitle(`🎭 ${event.name}`)
      .setDescription(`${event.description}\n\nTriggered by: <@${message.author.id}>`)
      .setColor((event.color || Colors.Blue) as ColorResolvable)
      .setTimestamp();
    
    // Add a random reaction
    const reactions = ['🔥', '😱', '😮', '😈', '👀', '💥'];
    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
    
    // Send the message and add reaction
    const sentMessage = await channel.send({ embeds: [embed] });
    await sentMessage.react(randomReaction).catch(console.error);
    
    // Log the event
    console.log(`[Drama Events] Triggered event: ${event.name} (${eventType})`);
  }
}

// Define the plugin
const dramaEventsPlugin: Plugin & { author: string } = {
  author: 'Catalyst Team',
  id: 'drama-events',
  name: 'Drama Events',
  description: 'Adds special drama events that can be triggered based on server activity',
  version: '1.0.0',
  enabled: true,
  
  // Plugin state
  config: {
    eventProbability: 0.05, // 5% chance per message with keywords
    announcementChannel: 'timeline',
    cooldownMinutes: 30
  },
  
  // Initialize plugin
  async onLoad(registry: any): Promise<void> {
    const client = registry.client as Client;
    console.log(`[Drama Events] Plugin loaded with ${DRAMA_EVENTS.length} event types`);
    
    // Announce plugin activation in timeline channel
    const guild = client.guilds.cache.first();
    if (guild) {
      const channel = guild.channels.cache.find(c => 
        c.isTextBased() && 'name' in c && c.name === this.config?.announcementChannel
      ) as TextChannel | undefined;
      
      if (channel && isTextChannelWithSend(channel)) {
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('🎭 Drama Events Activated')
              .setDescription('The drama events plugin is now active. Get ready for some excitement!')
              .setColor('#ff69b4')
          ]
        }).catch(console.error);
      }
    }
  },
  
  // Handle messages to detect potential drama events
  async onMessage(message: Message): Promise<void> {
    if (message.author.bot) return;
    
    const now = Date.now();
    const cooldownMs = (this.config?.cooldownMinutes || 30) * 60 * 1000;
    
    // Check cooldown
    if (now - lastEventTime < cooldownMs) return;
    
    // Check for keywords in message
    const content = message.content.toLowerCase();
    const matchedEventType = DRAMA_EVENTS.find(event => 
      event.keywords?.some((keyword: string) => content.includes(keyword))
    )?.id;
    
    // Trigger event if conditions are met
    if (matchedEventType && Math.random() < (this.config?.eventProbability || 0.05)) {
      await triggerDramaEvent(message, matchedEventType, this.config);
      lastEventTime = now;
    }
  }
};

export default dramaEventsPlugin;
