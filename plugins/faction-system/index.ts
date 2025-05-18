/**
 * Faction System Plugin
 * 
 * Enables users to create, join, and manage factions within the server
 */

import { Client, Message, EmbedBuilder, Colors, TextChannel, GuildMember, Role } from 'discord.js';
import { Plugin } from '../index';
import { isTextChannelWithSend } from '../../utils/discord-helpers';
import { CONFIG } from '../../config';
import { supabase } from '../../db';
import { v4 as uuidv4 } from 'uuid';

// Faction interface
interface Faction {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  createdAt: string;
  color: number;
  memberCount: number;
  power: number;
  emoji: string;
}

// Faction System Plugin
interface FactionSystemPlugin extends Plugin {
  commands: Record<string, (message: Message, args: string[]) => Promise<void>>;
  handleCreateFaction: (message: Message, args: string[]) => Promise<void>;
  handleJoinFaction: (message: Message, args: string[]) => Promise<void>;
  handleLeaveFaction: (message: Message, args: string[]) => Promise<void>;
  handleFactionInfo: (message: Message, args: string[]) => Promise<void>;
  handleListFactions: (message: Message) => Promise<void>;
  handleFactionHelp: (message: Message) => Promise<void>;
  handleFactionCommand: (message: Message, args: string[]) => Promise<void>;
}

// Create the plugin object
const factionSystemPlugin: FactionSystemPlugin = {
  id: 'faction-system',
  name: 'Faction System',
  description: 'Enables users to create, join, and manage factions within the server',
  version: '1.0.0',
  enabled: true,
  author: 'Catalyst Team',
  commands: {
    'faction': async (message, args) => factionSystemPlugin.handleFactionCommand(message, args),
    'factions': async (message, args) => factionSystemPlugin.handleFactionCommand(message, args)
  },
  
  // Plugin state
  config: {
    factionChannelCategory: 'FACTIONS',
    factionRolePrefix: 'faction-',
    maxFactionsPerServer: 10,
    minFactionNameLength: 3,
    maxFactionNameLength: 24
  },
  
  // Initialize plugin
  async onLoad(registry: any): Promise<void> {
    const client = registry.client as Client;
    console.log(`[Faction System] Plugin loaded`);
    
    // Create faction tables if they don't exist
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      const { error } = await supabase.rpc('init_faction_tables');
      if (error) {
        console.error('[Faction System] Error initializing faction tables:', error);
      } else {
        console.log('[Faction System] Faction tables initialized');
      }
    } catch (err) {
      console.error('[Faction System] Database error:', err);
    }
    
    // Announce plugin activation in general channel
    const guild = client.guilds.cache.first();
    if (guild) {
      const channel = guild.channels.cache.find(c => 
        c.isTextBased() && 'name' in c && c.name === 'general'
      ) as TextChannel | undefined;
      
      if (channel && isTextChannelWithSend(channel)) {
        if ('send' in channel) {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🏛️ Faction System Activated')
                .setDescription('The Faction System is now active! Use `!faction help` to see available commands.')
                .setColor(Colors.Blue)
                .setFooter({ text: 'Catalyst Faction System Plugin' })
                .setTimestamp()
            ]
          });
        }
      }
    }
  },
  
  // Handle messages for faction commands
  async onMessage(message: Message): Promise<void> {
    // Skip bot messages
    if (message.author.bot) return;
    
    // Check if message starts with faction command
    const prefix = CONFIG.BOT_PREFIX || '!';
    if (!message.content.startsWith(`${prefix}faction`) && !message.content.startsWith(`${prefix}factions`)) {
      return;
    }
    
    // Parse command
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();
    const subCommand = args.shift()?.toLowerCase() || 'help';
    
    // Handle faction commands
    if (command === 'faction' || command === 'factions') {
      switch (subCommand) {
        case 'create':
          await this.handleCreateFaction(message, args);
          break;
        case 'join':
          await this.handleJoinFaction(message, args);
          break;
        case 'leave':
          await this.handleLeaveFaction(message, args);
          break;
        case 'info':
          await this.handleFactionInfo(message, args);
          break;
        case 'list':
          await this.handleListFactions(message);
          break;
        case 'help':
        default:
          await this.handleFactionHelp(message);
          break;
      }
    }
  },
  
  // Handle faction creation
  async handleCreateFaction(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    
    // Check if user has permission to create a faction
    if (!message.member?.permissions.has('ManageRoles')) {
      await message.reply('You need the Manage Roles permission to create a faction.');
      return;
    }
    
    // Get faction name and description
    const name = args.shift();
    const description = args.join(' ');
    
    if (!name) {
      await message.reply('Please provide a name for your faction.');
      return;
    }
    
    if (!this.config || !this.config.minFactionNameLength || !this.config.maxFactionNameLength) return;
    if (name.length < this.config.minFactionNameLength || name.length > this.config.maxFactionNameLength) {
      await message.reply(`Faction name must be between ${this.config?.minFactionNameLength ?? 3} and ${this.config?.maxFactionNameLength ?? 32} characters.`);
      return;
    }
    
    // Check if faction already exists
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: existingFactions, error: fetchError } = await supabase
      .from('factions')
      .select('name')
      .eq('name', name)
      .limit(1);
    
    if (fetchError) {
      console.error('[Faction System] Error checking faction existence:', fetchError);
      await message.reply('An error occurred while creating your faction. Please try again later.');
      return;
    }
    
    if (existingFactions && existingFactions.length > 0) {
      await message.reply(`A faction named "${name}" already exists. Please choose a different name.`);
      return;
    }
    
    // Create faction in database
    const factionId = uuidv4();
    const factionColor = Math.floor(Math.random() * 0xFFFFFF);
    const factionEmoji = ['⚔️', '🛡️', '🏹', '🔮', '🧙', '🧝', '🧟', '🧞', '🦁', '🐉', '🐺', '🦊'][Math.floor(Math.random() * 12)];
    
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error: insertError } = await supabase
      .from('factions')
      .insert({
        id: factionId,
        name,
        description: description || `The ${name} faction`,
        leader_id: message.author.id,
        created_at: new Date().toISOString(),
        color: factionColor,
        member_count: 1,
        power: 10,
        emoji: factionEmoji
      });
    
    if (insertError) {
      console.error('[Faction System] Error creating faction:', insertError);
      await message.reply('An error occurred while creating your faction. Please try again later.');
      return;
    }
    
    // Add creator as first member
    if (!supabase) {
      console.error('[Faction System] Supabase client not initialized');
      await message.reply('An error occurred while creating your faction. Please try again later.');
      return;
    }
    const { error: memberError } = await supabase
      .from('faction_members')
      .insert({
        faction_id: factionId,
        user_id: message.author.id,
        joined_at: new Date().toISOString(),
        role: 'leader'
      });
    
    if (memberError) {
      console.error('[Faction System] Error adding faction member:', memberError);
    }
    
    // Create faction role
    try {
      const role = await message.guild.roles.create({
        name: `${this.config?.factionRolePrefix ?? ''}${name}`,
        color: factionColor,
        reason: `Faction created by ${message.author.tag}`
      });
      
      // Assign role to creator
      await message.member?.roles.add(role);
      
      // Create faction channel
      const category = message.guild.channels.cache.find(c => 
        c.type === 4 && c.name === (this.config?.factionChannelCategory ?? 'Factions')
      );
      
      if (!category) {
        // Create category if it doesn't exist
        const newCategory = await message.guild.channels.create({
          name: this.config?.factionChannelCategory ?? 'Factions',
          type: 4,
          reason: 'Faction System Category'
        });
        
        // Create faction channel in new category
        const factionChannel = await message.guild.channels.create({
          name: `faction-${name.toLowerCase().replace(/\s+/g, '-')}`,
          type: 0, // Text channel
          parent: newCategory.id,
          reason: `Faction channel for ${name}`,
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone.id,
              deny: ['ViewChannel']
            },
            {
              id: role.id,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
            }
          ]
        });
        
        // Send welcome message
        if (factionChannel && isTextChannelWithSend(factionChannel)) {
          await factionChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`${factionEmoji} Welcome to ${name}`)
                .setDescription(`This is the private channel for members of the ${name} faction.\n\n**Description:** ${description || `The ${name} faction`}`)
                .setColor(factionColor)
                .addFields(
                  { name: 'Leader', value: `<@${message.author.id}>`, inline: true },
                  { name: 'Members', value: '1', inline: true },
                  { name: 'Power', value: '10', inline: true }
                )
                .setFooter({ text: 'Use !faction help to see available commands' })
                .setTimestamp()
            ]
          });
        }
      } else {
        // Create faction channel in existing category
        const factionChannel = await message.guild.channels.create({
          name: `faction-${name.toLowerCase().replace(/\s+/g, '-')}`,
          type: 0, // Text channel
          parent: category?.id,
          reason: `Faction channel for ${name}`,
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone.id,
              deny: ['ViewChannel']
            },
            {
              id: role.id,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
            }
          ]
        });
        
        // Send welcome message
        if (factionChannel && isTextChannelWithSend(factionChannel)) {
          await factionChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`${factionEmoji} Welcome to ${name}`)
                .setDescription(`This is the private channel for members of the ${name} faction.\n\n**Description:** ${description || `The ${name} faction`}`)
                .setColor(factionColor)
                .addFields(
                  { name: 'Leader', value: `<@${message.author.id}>`, inline: true },
                  { name: 'Members', value: '1', inline: true },
                  { name: 'Power', value: '10', inline: true }
                )
                .setFooter({ text: 'Use !faction help to see available commands' })
                .setTimestamp()
            ]
          });
        }
      }
      
      // Announce faction creation
      const announceChannel = message.guild.channels.cache.find(c => 
        c.isTextBased() && 'name' in c && c.name === 'general'
      ) as TextChannel | undefined;
      
      if (announceChannel && isTextChannelWithSend(announceChannel)) {
        await announceChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`${factionEmoji} New Faction Created: ${name}`)
              .setDescription(`A new faction has been formed by <@${message.author.id}>!\n\n**Description:** ${description || `The ${name} faction`}`)
              .setColor(factionColor)
              .addFields(
                { name: 'Join Command', value: `\`!faction join ${name}\``, inline: true }
              )
              .setFooter({ text: 'Use !faction list to see all factions' })
              .setTimestamp()
          ]
        });
      }
      
      // Confirm to creator
      await message.reply(`Your faction "${name}" has been created successfully! Check out your faction channel.`);
      
    } catch (err) {
      console.error('[Faction System] Error creating faction role or channel:', err);
      await message.reply('Your faction was created, but there was an error setting up the role or channel.');
    }
  },
  
  // Handle joining a faction
  async handleJoinFaction(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    
    const factionName = args.join(' ');
    if (!factionName) {
      await message.reply('Please specify which faction you want to join. Use `!faction list` to see available factions.');
      return;
    }
    
    // Check if faction exists
    if (!supabase) {
      console.error('[Faction System] Supabase client not initialized');
      await message.reply('An error occurred while joining the faction. Please try again later.');
      return;
    }
    const { data: factions, error: fetchError } = await supabase
      .from('factions')
      .select('*')
      .ilike('name', factionName)
      .limit(1);
    
    if (fetchError) {
      console.error('[Faction System] Error fetching faction:', fetchError);
      await message.reply('An error occurred while joining the faction. Please try again later.');
      return;
    }
    
    if (!factions || factions.length === 0) {
      await message.reply(`Faction "${factionName}" not found. Use \`!faction list\` to see available factions.`);
      return;
    }
    
    const faction = factions[0];
    
    // Check if user is already in this faction
    if (!supabase) {
      console.error('[Faction System] Supabase client not initialized');
      await message.reply('An error occurred while joining the faction. Please try again later.');
      return;
    }
    const { data: membership, error: membershipError } = await supabase
      .from('faction_members')
      .select('*')
      .eq('faction_id', faction.id)
      .eq('user_id', message.author.id)
      .limit(1);
    
    if (membershipError) {
      console.error('[Faction System] Error checking faction membership:', membershipError);
      await message.reply('An error occurred while joining the faction. Please try again later.');
      return;
    }
    
    if (membership && membership.length > 0) {
      await message.reply(`You are already a member of the "${faction.name}" faction.`);
      return;
    }
    
    // Check if user is in another faction
    if (!supabase) {
      console.error('[Faction System] Supabase client not initialized');
      await message.reply('An error occurred while joining the faction. Please try again later.');
      return;
    }
    const { data: otherMembership, error: otherMembershipError } = await supabase
      .from('faction_members')
      .select('faction_id, factions:faction_id(name)')
      .eq('user_id', message.author.id)
      .limit(1);
    
    if (otherMembershipError) {
      console.error('[Faction System] Error checking other faction memberships:', otherMembershipError);
      await message.reply('An error occurred while joining the faction. Please try again later.');
      return;
    }
    
    if (otherMembership && otherMembership.length > 0) {
      const otherFactionName = otherMembership[0]?.factions?.[0]?.name ?? 'Unknown';
      await message.reply(`You are already a member of the "${otherFactionName}" faction. You must leave your current faction before joining a new one.`);
      return;
    }
    
    // Add user to faction
    if (!supabase) {
      console.error('[Faction System] Supabase client not initialized');
      await message.reply('An error occurred while joining the faction. Please try again later.');
      return;
    }
    const { error: joinError } = await supabase
      .from('faction_members')
      .insert({
        faction_id: faction.id,
        user_id: message.author.id,
        joined_at: new Date().toISOString(),
        role: 'member'
      });
    
    if (joinError) {
      console.error('[Faction System] Error joining faction:', joinError);
      await message.reply('An error occurred while joining the faction. Please try again later.');
      return;
    }
    
    // Update faction member count
    if (!supabase) {
      console.error('[Faction System] Supabase client not initialized');
      await message.reply('An error occurred while joining the faction. Please try again later.');
      return;
    }
    const { error: updateError } = await supabase
      .from('factions')
      .update({ member_count: faction.member_count + 1 })
      .eq('id', faction.id);
    
    if (updateError) {
      console.error('[Faction System] Error updating faction member count:', updateError);
    }
    
    // Assign faction role
    try {
      const role = message.guild.roles.cache.find(r => 
        r.name === `${this.config?.factionRolePrefix ?? ''}${faction?.name ?? ''}`
      );
      
      if (role) {
        await message.member?.roles.add(role);
      }
      
      // Announce new member in faction channel
      const factionChannel = message.guild.channels.cache.find(c => 
        c.isTextBased() && 'name' in c && c.name === `faction-${faction.name.toLowerCase().replace(/\s+/g, '-')}`
      ) as TextChannel | undefined;
      
      if (factionChannel && isTextChannelWithSend(factionChannel)) {
        await factionChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('New Member Joined')
              .setDescription(`<@${message.author.id}> has joined the faction!`)
              .setColor(faction.color)
              .setFooter({ text: `Faction: ${faction.name}` })
              .setTimestamp()
          ]
        });
      }
      
      // Confirm to user
      await message.reply(`You have successfully joined the "${faction.name}" faction!`);
      
    } catch (err) {
      console.error('[Faction System] Error assigning faction role:', err);
      await message.reply(`You've joined the "${faction.name}" faction, but there was an error assigning your role.`);
    }
  },
  
  // Handle leaving a faction
  async handleLeaveFaction(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    
    // Check if user is in a faction
    if (!supabase) {
      console.error('[Faction System] Supabase client not initialized');
      await message.reply('An error occurred while leaving the faction. Please try again later.');
      return;
    }
    const { data: membership, error: membershipError } = await supabase
      .from('faction_members')
      .select('faction_id, role, factions:faction_id(name, leader_id)')
      .eq('user_id', message.author.id)
      .limit(1);
    
    if (membershipError) {
      console.error('[Faction System] Error checking faction membership:', membershipError);
      await message.reply('An error occurred while leaving the faction. Please try again later.');
      return;
    }
    
    if (!membership || membership.length === 0) {
      await message.reply('You are not a member of any faction.');
      return;
    }
    
    const factionId = membership[0].faction_id;
    const factionName = membership[0]?.factions?.[0]?.name ?? 'Unknown';
    const isLeader = membership[0].role === 'leader';
    
    // Leaders can't leave their faction, they must transfer leadership first
    if (isLeader) {
      await message.reply(`As the leader of "${factionName}", you cannot leave the faction. You must transfer leadership to another member first.`);
      return;
    }
    
    // Remove user from faction
    if (!supabase) {
      console.error('[Faction System] Supabase client not initialized');
      await message.reply('An error occurred while leaving the faction. Please try again later.');
      return;
    }
    const { error: leaveError } = await supabase
      .from('faction_members')
      .delete()
      .eq('faction_id', factionId)
      .eq('user_id', message.author.id);
    
    if (leaveError) {
      console.error('[Faction System] Error leaving faction:', leaveError);
      await message.reply('An error occurred while leaving the faction. Please try again later.');
      return;
    }
    
    // Update faction member count
    if (!supabase) {
      console.error('[Faction System] Supabase client not initialized');
      await message.reply('An error occurred while leaving the faction. Please try again later.');
      return;
    }
    const { data: faction, error: fetchError } = await supabase
      .from('factions')
      .select('member_count')
      .eq('id', factionId)
      .limit(1);
    
    if (!fetchError && faction && faction.length > 0) {
      const { error: updateError } = await supabase
        .from('factions')
        .update({ member_count: Math.max(1, faction[0].member_count - 1) })
        .eq('id', factionId);
      
      if (updateError) {
        console.error('[Faction System] Error updating faction member count:', updateError);
      }
    }
    
    // Remove faction role
    try {
      const role = message.guild.roles.cache.find(r => 
        r.name === `${this.config?.factionRolePrefix ?? ''}${factionName ?? ''}`
      );
      
      if (role) {
        await message.member?.roles.remove(role);
      }
      
      // Announce member leaving in faction channel
      const factionChannel = message.guild.channels.cache.find(c => 
        c.isTextBased() && 'name' in c && c.name === `faction-${factionName.toLowerCase().replace(/\s+/g, '-')}`
      ) as TextChannel | undefined;
      
      if (factionChannel && isTextChannelWithSend(factionChannel)) {
        await factionChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Member Left')
              .setDescription(`<@${message.author.id}> has left the faction.`)
              .setColor(Colors.Grey)
              .setFooter({ text: `Faction: ${factionName}` })
              .setTimestamp()
          ]
        });
      }
      
      // Confirm to user
      await message.reply(`You have successfully left the "${factionName}" faction.`);
      
    } catch (err) {
      console.error('[Faction System] Error removing faction role:', err);
      await message.reply(`You've left the "${factionName}" faction, but there was an error removing your role.`);
    }
  },
  
  // Handle faction info command
  async handleFactionInfo(message: Message, args: string[]): Promise<void> {
    const factionName = args.join(' ');
    let factionQuery;
    
    if (!factionName) {
      // If no faction specified, show user's faction
      if (!supabase) {
        console.error('[Faction System] Supabase client not initialized');
        await message.reply('An error occurred while fetching faction information. Please try again later.');
        return;
      }
      factionQuery = supabase
        .from('faction_members')
        .select(`
          faction_id,
          factions:faction_id(
            id, name, description, leader_id, created_at, 
            color, member_count, power, emoji
          )
        `)
        .eq('user_id', message.author.id)
        .limit(1);
    } else {
      // Show specified faction
      if (!supabase) {
        console.error('[Faction System] Supabase client not initialized');
        await message.reply('An error occurred while fetching faction information. Please try again later.');
        return;
      }
      factionQuery = supabase
        .from('factions')
        .select('*')
        .ilike('name', factionName)
        .limit(1);
    }
    
    const { data, error } = await factionQuery;
    
    if (error) {
      console.error('[Faction System] Error fetching faction info:', error);
      await message.reply('An error occurred while fetching faction information. Please try again later.');
      return;
    }
    
    if (!data || data.length === 0) {
      if (!factionName) {
        await message.reply('You are not a member of any faction.');
      } else {
        await message.reply(`Faction "${factionName}" not found. Use \`!faction list\` to see available factions.`);
      }
      return;
    }
    
    // Extract faction data
    const faction = factionName ? data[0] : data[0].factions;
    
    // Get faction members
    if (!supabase) {
      console.error('[Faction System] Supabase client not initialized');
      await message.reply('An error occurred while fetching faction information. Please try again later.');
      return;
    }
    const { data: members, error: membersError } = await supabase
      .from('faction_members')
      .select('user_id, role')
      .eq('faction_id', faction.id)
      .order('role');
    
    if (membersError) {
      console.error('[Faction System] Error fetching faction members:', membersError);
    }
    
    // Format member list
    let memberList = 'No members found';
    if (members && members.length > 0) {
      memberList = members
        .map(m => `<@${m.user_id}>${m.role === 'leader' ? ' (Leader)' : ''}`)
        .join('\n');
      
      // Truncate if too long
      if (memberList.length > 1024) {
        memberList = memberList.substring(0, 1000) + `\n...and ${members.length - 10} more`;
  
  // Handle list factions command
  async handleListFactions(message: Message): Promise<void> {
    // Get all factions
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: factions, error } = await supabase
      .from('factions')
      .select('*')
      .order('member_count', { ascending: false });
    
    if (error) {
      console.error('[Faction System] Error fetching factions:', error);
      await message.reply('An error occurred while fetching factions. Please try again later.');
      return;
    }
    
    if (!factions || factions.length === 0) {
      await message.reply('No factions have been created yet. Use `!faction create <name> [description]` to create one!');
      return;
    }
    
    // Format faction list
    const factionList = factions.map(f => 
      `${f.emoji} **${f.name}** - ${f.member_count} members, ${f.power} power\n*${f.description.substring(0, 50)}${f.description.length > 50 ? '...' : ''}*`
    ).join('\n\n');
    
    // Send faction list
    if ('send' in message.channel) {
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🏛️ Factions')
            .setDescription(`Here are the current factions:\n\n${factionList}`)
            .setColor(Colors.Blue)
            .setFooter({ text: 'Use !faction join <name> to join a faction' })
            .setTimestamp()
        ]
      });
  // Handle faction help command
  async handleFactionHelp(message: Message): Promise<void> {
    const helpEmbed = new EmbedBuilder()
      .setTitle('Faction Commands')
      .setDescription('Here are the available faction commands:')
      .addFields(
        { name: '!faction create <name> <emoji>', value: 'Create a new faction' },
        { name: '!faction join <name>', value: 'Join an existing faction' },
        { name: '!faction leave', value: 'Leave your current faction' },
        { name: '!faction info [name]', value: 'Get info about a faction' },
        { name: '!factions', value: 'List all factions' }
      )
      .setColor(Colors.Blue);
      
    await message.channel.send({ embeds: [helpEmbed] });
  },
  
  // Handle faction command routing
  async handleFactionCommand(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
      return this.handleFactionHelp(message);
    }
    
    const subcommand = args[0].toLowerCase();
    const subcommandArgs = args.slice(1);
    
    switch (subcommand) {
      case 'create':
        return this.handleCreateFaction(message, subcommandArgs);
      case 'join':
        return this.handleJoinFaction(message, subcommandArgs);
      case 'leave':
        return this.handleLeaveFaction(message, subcommandArgs);
      case 'info':
        return this.handleFactionInfo(message, subcommandArgs);
      case 'help':
      default:
        return this.handleFactionHelp(message);
    }
  }
};

export default factionSystemPlugin;
