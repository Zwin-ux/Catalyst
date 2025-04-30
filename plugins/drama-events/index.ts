/**
 * Drama Events Plugin
 * 
 * Adds special drama events that can be triggered based on server activity
 */

import { Client, Message, EmbedBuilder, Colors, TextChannel } from 'discord.js';
import { eventCapture } from '../../core/eventCapture';
import { Plugin } from '../index';
import { isTextChannelWithSend } from '../../utils/discord-helpers';
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
    color: Colors.Purple,
    image: 'https://cdn.pixabay.com/photo/2017/01/31/13/14/soap-bubble-2025834_1280.jpg',
    points: 15
  },
  {
    id: 'drama_night',
    name: 'Drama Night',
    description: 'The server is experiencing a surge of drama! All drama points are doubled for the next hour.',
    color: Colors.Gold,
    image: 'https://cdn.pixabay.com/photo/2017/01/31/13/14/soap-bubble-2025834_1280.jpg',
    points: 5
  },
  {
    id: 'coup',
    name: 'Coup Attempt',
    description: 'A faction member is attempting to overthrow their leader!',
    color: Colors.DarkRed,
    image: 'https://cdn.pixabay.com/photo/2016/03/31/19/14/crown-1294906_1280.png',
    points: 20
  }
];

// Keyword triggers for drama events
const DRAMA_KEYWORDS = {
  'faction_war': ['war', 'battle', 'fight', 'conflict', 'attack'],
  'betrayal': ['betray', 'backstab', 'traitor', 'turncoat', 'defect'],
  'drama_night': ['drama', 'chaos', 'mayhem', 'wild'],
  'coup': ['overthrow', 'coup', 'rebellion', 'revolt', 'usurp', 'takeover']
};

// Subscribe to event bus for messages
// This enables drama events to trigger on all messages, even outside plugin system
// (still allows pluginManager to call onMessage for legacy support)
eventCapture.on('message', (msg: Message) => {
  dramaEventsPlugin.onMessage(msg).catch(console.error);
});

// Drama Events Plugin
const dramaEventsPlugin: Plugin = {
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
  
  // Track last event time to prevent spam
  lastEventTime: Date.now() - 3600000, // Start with a cooldown of 1 hour ago
  
  // Initialize plugin
  async onLoad(client: Client): Promise<void> {
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
              .setTitle('🎭 Drama Events System Activated')
              .setDescription('The Drama Events system is now active! Special events can now be triggered based on server activity.')
              .setColor(Colors.Green)
              .setFooter({ text: 'Catalyst Drama Events Plugin' })
              .setTimestamp()
          ]
        });
      }
    }
  },
  
  // Handle messages to detect potential drama events
  async onMessage(message: Message): Promise<void> {
    // Skip bot messages and respect cooldown
    if (message.author.bot) return;
    
    const now = Date.now();
    const cooldownMs = (this.config?.cooldownMinutes || 30) * 60 * 1000;
    if (now - (this.lastEventTime as number) < cooldownMs) return;
    
    // Check for drama keywords
    const content = message.content.toLowerCase();
    let matchedEventType: string | null = null;
    
    // Check each event type for keyword matches
    for (const [eventType, keywords] of Object.entries(DRAMA_KEYWORDS)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        matchedEventType = eventType;
        break;
      }
    }
    
    // If keywords matched and random chance is met, trigger event
    if (matchedEventType && Math.random() < (this.config?.eventProbability || 0.05)) {
      await this.triggerDramaEvent(message, matchedEventType);
      this.lastEventTime = now;
    }
  },
  
  // Trigger a drama event
  async triggerDramaEvent(message: Message, eventType: string): Promise<void> {
    const event = DRAMA_EVENTS.find(e => e.id === eventType);
    if (!event) return;
    
    // Find the announcement channel
    const channel = message.guild?.channels.cache.find(c => 
      c.isTextBased() && 'name' in c && c.name === (this.config?.announcementChannel || 'timeline')
    ) as TextChannel | undefined;
    
    if (channel && isTextChannelWithSend(channel)) {
      // Create the event embed
      const embed = new EmbedBuilder()
        .setTitle(`🎭 ${event.name}`)
        .setDescription(`${event.description}\n\nTriggered by: <@${message.author.id}>`)
        .setColor(event.color)
        .setImage(event.image)
        .addFields({ name: 'Drama Points', value: `+${event.points} points`, inline: true })
        .setFooter({ text: 'React to participate in this event!' })
        .setTimestamp();
      
      // Send the announcement
      const eventMessage = await channel.send({ embeds: [embed] });
      
      // Add reaction options
      await eventMessage.react('👍'); // Support
      await eventMessage.react('👎'); // Oppose
      await eventMessage.react('🔥'); // Escalate
      
      console.log(`[Drama Events] Triggered ${event.name} event`);
    }
  }
};

export default dramaEventsPlugin;
