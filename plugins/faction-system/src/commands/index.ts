import { SlashCommandBuilder } from 'discord.js';
import FactionSystemPlugin from '../factionPlugin';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: any, plugin: typeof FactionSystemPlugin) => Promise<void>;
}

// Import all commands
const commands: Command[] = [
  // Add commands here
];

export default commands;
