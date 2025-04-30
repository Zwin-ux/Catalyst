// Environment Configuration Example
// Copy this file to config.ts and fill in your actual credentials

export const CONFIG = {
  // Discord Bot Configuration
  DISCORD_BOT_TOKEN: 'your_discord_bot_token_here',
  
  // Supabase Database Configuration
  SUPABASE_URL: 'your_supabase_url_here',
  SUPABASE_KEY: 'your_supabase_key_here',
  
  // Optional: OpenAI Integration (for NLP features)
  OPENAI_API_KEY: 'optional_openai_api_key',
  
  // Game Mechanics Configuration
  DRAMA_THRESHOLD: 5,           // Minimum drama score to trigger events
  FACTION_MIN_MEMBERS: 3,       // Minimum members to form a faction
  COUP_THRESHOLD: 10,           // Points needed to initiate a coup
  EVENT_FREQUENCY_MINUTES: 30,  // How often to run scheduled events
  
  // Discord Server Configuration
  ADMIN_ROLE_NAME: 'Catalyst Admin',
  SOVEREIGN_ROLE_NAME: 'Sovereign',
  ANNOUNCE_CHANNEL: 'drama-announcements',
};
