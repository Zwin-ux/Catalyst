/**
 * Command Handler for Catalyst Discord Bot
 * 
 * Handles text commands with a simple prefix-based system
 */

import { Message, Client, TextChannel, EmbedBuilder, Colors } from 'discord.js';
import { CONFIG } from '../config';
import { isTextChannelWithSend } from '../utils/discord-helpers';

// Command interface
export interface Command {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  execute: (message: Message, args: string[]) => Promise<any>;
}

// Collection of registered commands
const commands = new Map<string, Command>();
const aliases = new Map<string, string>();

// Register a command
export function registerCommand(command: Command): void {
  commands.set(command.name, command);
  if (command.aliases) {
    command.aliases.forEach(alias => {
      aliases.set(alias, command.name);
    });
  }
  console.log(`Registered command: ${command.name}`);
}

// Process a command message
export async function handleCommand(client: Client, message: Message): Promise<boolean> {
  const prefix = CONFIG.BOT_PREFIX || '!';
  
  // Check if message starts with prefix
  if (!message.content.startsWith(prefix) || message.author.bot) {
    return false;
  }
  
  // Parse command and arguments
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase() || '';
  
  // Find command or its alias
  let command = commands.get(commandName);
  if (!command) {
    const aliasedName = aliases.get(commandName);
    if (aliasedName) {
      command = commands.get(aliasedName);
    }
  }
  
  // If command not found, ignore
  if (!command) {
    return false;
  }
  
  // Execute command
  try {
    await command.execute(message, args);
    return true;
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    if (isTextChannelWithSend(message.channel)) {
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle('⚠️ Command Error')
            .setDescription('There was an error executing that command.')
            .setFooter({ text: 'Catalyst Bot Error' })
        ]
      });
    }
    return false;
  }
}

// Help command - lists all available commands
registerCommand({
  name: 'help',
  description: 'Lists all available commands and playful mechanics',
  usage: '!help [command]',
  aliases: ['commands', 'h'],
  execute: async (message, args) => {
    if (!isTextChannelWithSend(message.channel)) return;
    
    // If specific command help requested
    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || 
                      commands.get(aliases.get(commandName) || '');
      
      if (!command) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Red)
              .setTitle('❓ Unknown Command')
              .setDescription(`Command \`${commandName}\` not found. Use \`!help\` to see all commands.`)
          ]
        });
      }
      
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Blue)
            .setTitle(`Command: ${command.name}`)
            .setDescription(command.description)
            .addFields(
              { name: 'Usage', value: command.usage },
              { name: 'Aliases', value: command.aliases?.join(', ') || 'None' }
            )
        ]
      });
    }
    
    // List all commands
    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle('📋 Catalyst Bot Commands')
      .setDescription('Here are all available commands and creative event mechanics:')
      .setFooter({ text: 'Use !help [command] for more info' });
    
    commands.forEach(cmd => {
      embed.addFields({ name: cmd.name, value: cmd.description });
    });
    
    return message.channel.send({ embeds: [embed] });
  }
});

// Status command - basic bot status
registerCommand({
  name: 'status',
  description: 'Check the bot status and connection',
  usage: '!status',
  aliases: ['ping', 'uptime'],
  execute: async (message) => {
    if (!isTextChannelWithSend(message.channel)) return;
    
    const uptime = process.uptime();
    const uptimeStr = formatUptime(uptime);
    
    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle('🤖 Catalyst Bot Status')
      .addFields(
        { name: 'Status', value: 'Online' },
        { name: 'Ping', value: `${Math.round(message.client.ws.ping)}ms` },
        { name: 'Uptime', value: uptimeStr },
        { name: 'Server Count', value: message.client.guilds.cache.size.toString() }
      )
      .setFooter({ text: 'Catalyst Discord Bot' })
      .setTimestamp();
    
    return message.channel.send({ embeds: [embed] });
  }
});

// Format uptime string
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// Test command - checks all registered commands for structure and execution
registerCommand({
  name: 'testcommands',
  description: 'Tests all registered commands for structure and execution',
  usage: '!testcommands',
  aliases: ['testcmds', 'testall'],
  execute: async (message) => {
    if (!isTextChannelWithSend(message.channel)) return;
    const results: string[] = [];
    for (const [name, cmd] of commands.entries()) {
      // Check structure
      const hasName = typeof cmd.name === 'string';
      const hasDesc = typeof cmd.description === 'string';
      const hasUsage = typeof cmd.usage === 'string';
      const hasExec = typeof cmd.execute === 'function';
      let execResult = '✅';
      try {
        // Try executing with dummy args (don't send messages for help/status)
        if (name !== 'testcommands') {
          await Promise.resolve(cmd.execute(message, ['dummy']));
        }
      } catch (e) {
        execResult = `❌ (${e instanceof Error ? e.message : 'error'})`;
      }
      results.push(`**${name}**: structure: ${hasName && hasDesc && hasUsage && hasExec ? '✅' : '❌'} | exec: ${execResult}`);
    }
    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Yellow)
          .setTitle('🧪 Command Test Results')
          .setDescription(results.join('\n'))
          .setFooter({ text: 'Catalyst Bot Command Test' })
      ]
    });
  }
});

export default {
  handleCommand,
  registerCommand
};
