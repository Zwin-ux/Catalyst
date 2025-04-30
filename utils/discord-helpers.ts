/**
 * Utility functions for working with Discord.js
 */
import { TextChannel, Channel, GuildMember, Guild } from 'discord.js';

/**
 * Type guard to check if a channel is a TextChannel with the send method
 * @param channel The channel to check
 * @returns True if the channel is a TextChannel with send capability
 */
export function isTextChannelWithSend(channel: Channel | null): channel is TextChannel {
  return channel !== null && channel.type === 0 && 'send' in channel;
}

/**
 * Ensures a value is a valid string or returns a default
 * @param value The value to check
 * @param defaultValue The default value to return if input is undefined
 * @returns A guaranteed string value
 */
export function ensureString(value: string | undefined | null, defaultValue: string = ''): string {
  return value !== undefined && value !== null ? value : defaultValue;
}

/**
 * Gets a member's display name, falling back to username if not available
 * @param member The guild member
 * @returns The best display name to use
 */
export function getMemberDisplayName(member: GuildMember): string {
  return member.nickname || member.user.displayName || member.user.username;
}

/**
 * Check if a member has a specific role by name
 * @param member The guild member to check
 * @param roleName The name of the role to check for
 * @returns True if the member has the role
 */
export function memberHasRole(member: GuildMember, roleName: string): boolean {
  return member.roles.cache.some(role => role.name === roleName);
}

/**
 * Gets a channel by name from a guild
 * @param guild The guild to search in
 * @param channelName The name of the channel to find
 * @returns The found channel or undefined
 */
export function getChannelByName(guild: Guild, channelName: string): TextChannel | undefined {
  return guild.channels.cache.find(
    channel => channel.name === channelName && isTextChannelWithSend(channel)
  ) as TextChannel | undefined;
}
