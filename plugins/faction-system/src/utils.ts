import { Guild, User as DiscordUser, TextChannel, CategoryChannel, Role } from 'discord.js';
import { Faction } from '../../db/models';

/**
 * Validates a faction name
 * @param name The name to validate
 * @returns Validation result with success status and optional error message
 */
export function validateFactionName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Faction name cannot be empty' };
  }
  
  if (name.length < 3) {
    return { valid: false, error: 'Faction name must be at least 3 characters long' };
  }
  
  if (name.length > 32) {
    return { valid: false, error: 'Faction name cannot be longer than 32 characters' };
  }
  
  // Allow letters, numbers, spaces, and some special characters
  if (!/^[\w\s-]+$/i.test(name)) {
    return { valid: false, error: 'Faction name can only contain letters, numbers, spaces, hyphens, and underscores' };
  }
  
  return { valid: true };
}

/**
 * Validates a faction description
 * @param description The description to validate
 * @returns Validation result with success status and optional error message
 */
export function validateFactionDescription(description: string): { valid: boolean; error?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: false, error: 'Description cannot be empty' };
  }
  
  if (description.length < 10) {
    return { valid: false, error: 'Description must be at least 10 characters long' };
  }
  
  if (description.length > 1000) {
    return { valid: false, error: 'Description cannot be longer than 1000 characters' };
  }
  
  return { valid: true };
}

/**
 * Creates a faction role
 * @param guild The guild to create the role in
 * @param faction The faction to create the role for
 * @returns The created role
 */
export async function createFactionRole(guild: Guild, faction: Faction): Promise<Role> {
  return guild.roles.create({
    name: faction.name,
    color: 'DEFAULT',
    reason: `Created for faction: ${faction.name} (${faction.id})`,
    permissions: [],
    mentionable: true,
  });
}

/**
 * Creates a faction channel
 * @param guild The guild to create the channel in
 * @param faction The faction to create the channel for
 * @param categoryId Optional category ID to place the channel in
 * @returns The created text channel
 */
export async function createFactionChannel(
  guild: Guild,
  faction: Faction,
  categoryId?: string
): Promise<TextChannel> {
  const channelName = `faction-${faction.name.toLowerCase().replace(/\s+/g, '-')}`.substring(0, 100);
  
  const options: any = {
    type: 'GUILD_TEXT',
    topic: `Chat for the ${faction.name} faction`,
    reason: `Created for faction: ${faction.name} (${faction.id})`,
  };
  
  if (categoryId) {
    const category = guild.channels.cache.get(categoryId);
    if (category?.type === 'GUILD_CATEGORY') {
      options.parent = category;
    }
  }
  
  return guild.channels.create(channelName, options);
}

/**
 * Sends a welcome message to a new faction member
 * @param user The user who joined the faction
 * @param faction The faction they joined
 * @param channel Optional channel to send the welcome message to
 */
export async function sendWelcomeMessage(
  user: DiscordUser,
  faction: Faction,
  channel?: TextChannel
): Promise<void> {
  if (!channel) return;
  
  const welcomeMessage = `🎉 **${user.username}** has joined the **${faction.name}** faction!`;
  
  try {
    await channel.send(welcomeMessage);
  } catch (error) {
    console.error(`Failed to send welcome message for ${faction.id}:`, error);
  }
}

/**
 * Formats a faction for display
 * @param faction The faction to format
 * @returns Formatted string representation of the faction
 */
export function formatFaction(faction: Faction): string {
  return [
    `**${faction.name}**`,
    faction.description ? `\n${faction.description}` : '',
    `\n👑 **Leader**: <@${faction.leaderIds[0]}>`,
    `👥 **Members**: ${faction.memberIds.length}`,
    `⚔️ **Power**: ${faction.power || 0}`,
    faction.createdAt ? `\n📅 Created: <t:${Math.floor(new Date(faction.createdAt).getTime() / 1000)}:D>` : ''
  ].join('\n');
}

export {
  createFactionRole,
  createFactionChannel,
  sendWelcomeMessage,
  formatFaction
};
