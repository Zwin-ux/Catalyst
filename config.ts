// Environment Configuration
// IMPORTANT: Never commit this file to version control

export const CONFIG = {
  // Discord Bot Configuration
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || '',
  BOT_PREFIX: '!',
  
  // Supabase Database Configuration
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_KEY || '',
  
  // Direct PostgreSQL connection (for advanced queries)
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // Game Mechanics Configuration
  DRAMA_THRESHOLD: 75,           // Minimum drama score to trigger events
  FACTION_MIN_MEMBERS: 3,       // Minimum members to form a faction
  COUP_THRESHOLD: 85,           // Points needed to initiate a coup
  EVENT_FREQUENCY_MINUTES: 30,  // How often to run scheduled events
  
  // Discord Server Configuration
  ADMIN_ROLE_NAME: 'Catalyst Admin',
  SOVEREIGN_ROLE_NAME: 'Sovereign',
  ANNOUNCE_CHANNEL: 'timeline',
  
  // Server Control Plugin Configuration
  ENABLE_SERVER_RESTRUCTURING: true,
  SERVER_CHAOS_THRESHOLD: 80,
  REORG_COOLDOWN_HOURS: 24,
  MAX_CHANNELS: 50,
  MIN_CHANNELS: 10
};
