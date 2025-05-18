import { Client, Events } from 'discord.js';
import FactionSystemPlugin from '../factionPlugin';

export interface Event {
  name: keyof typeof Events | string;
  once?: boolean;
  execute: (client: Client, plugin: typeof FactionSystemPlugin, ...args: any[]) => Promise<void> | void;
}

// Import all events
const events: Event[] = [
  // Add events here
];

export default events;
