export const appConfig = {
  port: Number(process.env.PORT || 3000),
  discordToken: process.env.DISCORD_BOT_TOKEN || '',
  discordApplicationId: process.env.DISCORD_APPLICATION_ID || '',
  discordDevGuildId: process.env.DISCORD_DEV_GUILD_ID || '',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
};
