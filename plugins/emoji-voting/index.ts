import { Plugin } from '../../engine/types';
import { eventCapture } from '../../core/eventCapture';
import { Message } from 'discord.js';

export const manifest = {
  name: "Emoji Voting",
  version: "1.0.0",
  author: "Catalyst Team",
  description: "Adds emoji voting to channels.",
  entry: "index.ts"
};

export const plugin: Plugin = {
  manifest,
  init(bus) {
    // Legacy plugin bus support
    bus.on('messageCreate', async (event) => {
      // Add emoji voting logic here!
    });
  }
};

// Event bus-driven: subscribe to message events globally
// This allows emoji voting to work regardless of pluginManager wiring
// (for consistency with other event-driven plugins)
eventCapture.on('message', async (msg: Message) => {
  // Add emoji voting logic here!
  // Example: if message in a voting-enabled channel, add reactions
  // if (msg.channel.id === 'someVotingChannelId') {
  //   await msg.react('👍');
  //   await msg.react('👎');
  // }
});
