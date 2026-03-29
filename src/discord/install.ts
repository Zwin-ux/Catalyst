import { PermissionFlagsBits } from 'discord.js';

const DEFAULT_PERMISSIONS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.EmbedLinks |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.UseApplicationCommands;

export function getCatalystInstallPermissions(): string {
  return DEFAULT_PERMISSIONS.toString();
}

export function buildDiscordInstallUrl(applicationId: string): string {
  const params = new URLSearchParams({
    client_id: applicationId,
    scope: 'bot applications.commands',
    permissions: getCatalystInstallPermissions(),
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
