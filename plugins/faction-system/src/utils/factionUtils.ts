import { 
  Guild, 
  GuildMember, 
  Role, 
  TextChannel, 
  VoiceChannel, 
  CategoryChannel,
  PermissionFlagsBits, 
  GuildBasedChannel,
  ChannelType,
  OverwriteType,
  GuildChannelCreateOptions,
  PermissionResolvable,
  OverwriteResolvable
} from 'discord.js'; 
import { Faction } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type FactionRoleType = 'leader' | 'officer' | 'member';

// Keep consistent casing with FactionRoleType
type FactionRoleTypeExtended = 'leader' | 'officer' | 'member' | 'recruit';

interface FactionRoleOptions {
  name: string;
  color?: number;
  hoist?: boolean;
  mentionable?: boolean;
  position?: number;
  permissions?: PermissionResolvable;
}

// Define a custom permission overwrite type that matches Discord.js expectations
type FactionPermissionOverwrite = {
  id: string;
  type: 'member' | 'role';
  allow?: PermissionResolvable;
  deny?: PermissionResolvable;
};

// Create a type for the channel options by intersecting the base options with our custom properties
export type FactionChannelOptions = Omit<GuildChannelCreateOptions, 'type' | 'permissionOverwrites'> & {
  type: ChannelType.GuildText | ChannelType.GuildVoice | ChannelType.GuildCategory;
  permissionOverwrites?: FactionPermissionOverwrite[];
};

// Type for faction channels - includes only the channel types we want to support
export type FactionChannel = TextChannel | VoiceChannel | CategoryChannel;

// Validation functions
export function validateFactionName(name: string, minLength: number = 3, maxLength: number = 32): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Faction name must be a string' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length < minLength) {
    return { valid: false, error: `Faction name must be at least ${minLength} characters long` };
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Faction name must be no longer than ${maxLength} characters` };
  }
  
  // Add any additional validation rules (e.g., allowed characters)
  const validChars = /^[\w\s-]+$/;
  if (!validChars.test(trimmed)) {
    return { valid: false, error: 'Faction name can only contain letters, numbers, spaces, hyphens, and underscores' };
  }
  
  return { valid: true };
}

export function validateFactionDescription(description: string, maxLength: number = 500): { valid: boolean; error?: string } {
  if (description && description.length > maxLength) {
    return { valid: false, error: `Description must be no longer than ${maxLength} characters` };
  }
  return { valid: true };
}

// Role and channel creation
export async function createFactionRole(
  guild: Guild,
  faction: Faction,
  options: FactionRoleOptions
): Promise<Role | null> {
  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error('Bot does not have permission to manage roles');
  }
  try {
    const roleOptions = {
      name: options.name,
      color: options.color,
      hoist: options.hoist,
      mentionable: options.mentionable,
      position: options.position,
      permissions: options.permissions,
      reason: `Faction role for ${faction.name}`
    };

    const role = await guild.roles.create(roleOptions);
    return role;
  } catch (error) {
    console.error('Error creating faction role:', error);
    throw new Error('Failed to create faction role');
  }
};

export async function createFactionChannel(
  guild: Guild,
  faction: Faction,
  options: FactionChannelOptions
): Promise<FactionChannel | null> {
  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error('Bot does not have permission to manage channels');
  }
  try {
    const channelOptions: any = { ...options };
    
    // Convert permission overwrites to Discord.js format
    if (options.permissionOverwrites) {
      channelOptions.permissionOverwrites = options.permissionOverwrites.map(overwrite => ({
        id: overwrite.id,
        type: overwrite.type === 'member' ? OverwriteType.Member : OverwriteType.Role,
        allow: overwrite.allow || [],
        deny: overwrite.deny || []
      }));
    }
    
    const channel = await guild.channels.create({
      ...channelOptions,
      reason: `Faction channel for ${faction.name}`
    });

    // Ensure the channel is one of the expected types
    if (channel instanceof TextChannel || channel instanceof VoiceChannel || channel instanceof CategoryChannel) {
      return channel;
    }
    
    // If it's not one of the expected types, delete it and return null
    await channel.delete('Unexpected channel type created');
    return null;
  } catch (error) {
    console.error('Error creating faction channel:', error);
    throw new Error('Failed to create faction channel');
  }
};

// Member management
export function addFactionMember(
  faction: Faction,
  member: GuildMember,
  role: FactionRoleType = 'member'
): Faction {
  const updatedFaction = { ...faction };
  
  // Initialize members array if it doesn't exist
  if (!updatedFaction.members) {
    updatedFaction.members = [];
  }
  
  // Add member to members array if not already present
  if (!updatedFaction.members.some((m) => m.id === member.id)) {
    updatedFaction.members.push({
      id: member.id,
      role,
      joinedAt: new Date(),
      lastActive: new Date()
    });
  }
  
  // Add member to memberIds array if not already present
  if (!updatedFaction.memberIds?.includes(member.id)) {
    updatedFaction.memberIds = [...(updatedFaction.memberIds || []), member.id];
  }
  
  return updatedFaction;
};

export function removeFactionMember(
  faction: Faction,
  memberId: string
): Faction {
  const updatedFaction = { ...faction };
  
  // Remove member from members array if it exists
  if (updatedFaction.members) {
    updatedFaction.members = updatedFaction.members.filter(
      (m) => m.id !== memberId
    );
  }
  
  // Remove member from memberIds array if it exists
  if (updatedFaction.memberIds) {
    updatedFaction.memberIds = updatedFaction.memberIds.filter(id => id !== memberId);
  }
  
  // Remove from leaderIds if present
  if (updatedFaction.leaderIds) {
    updatedFaction.leaderIds = updatedFaction.leaderIds.filter(id => id !== memberId);
  }
  
  // If no more members, mark as inactive
  if (updatedFaction.memberIds?.length === 0) {
    updatedFaction.isActive = false;
  }
  
  return updatedFaction;
};

// Power management
export function updateFactionPower(
  faction: Faction,
  amount: number,
  action: 'add' | 'set' = 'add'
): Faction {
  let newPower = faction.power;
  
  if (action === 'add') {
    newPower += amount;
  } else {
    newPower = amount;
  }

  // Apply any power bounds if needed
  // Example: newPower = Math.max(0, Math.min(newPower, MAX_POWER));
  
  return { ...faction, power: newPower };
}

// Formatting
export function formatFactionList(factions: Faction[]): string {
  if (factions.length === 0) {
    return 'No factions found.';
  }

  return factions
    .map(
      (faction, index) => 
        `${index + 1}. **${faction.name}** - ${faction.memberIds.length} members`
    )
    .join('\n');
}

export function formatFactionInfo(faction: Faction): string {
  return [
    `**${faction.name}**`,
    `ID: ${faction.id}`,
    `Power: ${faction.power}`,
    `Members: ${faction.memberIds.length}`,
    `Leaders: ${faction.leaderIds.length}`,
    `Created: ${faction.createdAt.toLocaleDateString()}`,
    faction.description && `\n${faction.description}`
  ]
    .filter(Boolean)
    .join('\n');
}

// Permission utilities
export function hasFactionPermission(
  faction: Faction,
  userId: string,
  requiredRole: FactionRoleType = 'member'
): boolean {
  const member = faction.members.find(m => m.id === userId);
  if (!member) return false;

  const roleHierarchy: Record<FactionRoleType, number> = {
    leader: 3,
    officer: 2,
    member: 1
  };

  const normalizedRole = member.role.toLowerCase() as FactionRoleType;
  if (!Object.keys(roleHierarchy).includes(normalizedRole)) {
    throw new Error(`Invalid role type: ${member.role}`);
  }

  return roleHierarchy[normalizedRole] >= roleHierarchy[requiredRole];
}

/**
 * Validates a faction name
 * @param name The name to validate
 * @returns Validation result with success status and optional error message
 */
export function validateFactionNameOld(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Faction name cannot be empty' };
  }
  
  if (name.length < 3) {
    return { valid: false, error: 'Faction name must be at least 3 characters long' };
  }
  
  if (name.length > 32) {
    return { valid: false, error: 'Faction name cannot exceed 32 characters' };
  }
  
  // Only allow letters, numbers, spaces, and basic punctuation
  if (!/^[\w\s-]+$/i.test(name)) {
    return { valid: false, error: 'Faction name can only contain letters, numbers, spaces, and hyphens' };
  }
  
  return { valid: true };
}

/**
 * Validates a faction description
 * @param description The description to validate
 * @returns Validation result with success status and optional error message
 */
export function validateFactionDescriptionOld(description: string): { valid: boolean; error?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: false, error: 'Description cannot be empty' };
  }
  
  if (description.length < 10) {
    return { valid: false, error: 'Description must be at least 10 characters long' };
  }
  
  if (description.length > 1000) {
    return { valid: false, error: 'Description cannot exceed 1000 characters' };
  }
  
  return { valid: true };
}

/**
    }
  }
  
  // Create the channel with proper permissions
  const channelOptions = {
    name: `faction-${faction.name.toLowerCase().replace(/\s+/g, '-')}`,
    type: ChannelType.GuildText,
    parent: category?.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [
          PermissionFlagsBits.ViewChannel
        ] as PermissionResolvable[]
      },
      {
        id: faction.roleId || guild.roles.everyone.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ] as PermissionResolvable[]
      }
    ]
  };
  
  const channel = await guild.channels.create(channelOptions);
  
  if (!(channel instanceof TextChannel)) {
    throw new Error('Failed to create text channel');
  }
  
  return channel;
}

/**
 * Sends a welcome message to a faction channel
 * @param channel The channel to send the welcome message to
 * @param faction The faction being welcomed
 * @param user The user who triggered the welcome (e.g., the creator or inviter)
 */
export async function sendWelcomeMessage(
  channel: TextChannel,
  faction: Faction,
  user: { id: string; username: string }
): Promise<void> {
  try {
    await channel.send({
      embeds: [{
        title: `Welcome to ${faction.name}!`,
        description: faction.description || 'No description provided.',
        color: 0x00ff00,
        fields: [
          { name: 'Leader', value: `<@${faction.leaderIds?.[0] || 'Unknown'}>`, inline: true },
          { name: 'Members', value: faction.memberIds?.length.toString() || '0', inline: true },
          { name: 'Power', value: faction.power?.toString() || '0', inline: true }
        ],
        footer: {
          text: `Created by ${user.username}`,
          icon_url: `https://cdn.discordapp.com/avatars/${user.id}/${user.id}.png`
        },
        timestamp: new Date().toISOString()
      }]
    });
  } catch (error) {
    console.error('Failed to send welcome message:', error);
    throw error;
  }
}

/**
 * Formats faction information for display
 * @param faction The faction to format
 * @returns Formatted string with faction information
 */
export function formatFaction(faction: Faction): string {
  return [
    `**${faction.name}**`,
    faction.description ? `*${faction.description}*` : '',
    `👑 **Leader**: <@${faction.leaderIds?.[0] || 'Unknown'}>`,
    `👥 **Members**: ${faction.memberIds?.length || 0}`,
    `⚡ **Power**: ${faction.power || 0}`,
    `📅 **Created**: <t:${Math.floor((faction.createdAt?.getTime() || Date.now()) / 1000)}:R>`
  ].filter(Boolean).join('\n');
}
