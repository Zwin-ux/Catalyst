-- Catalyst Discord Bot Database Schema
-- Run this script to create the necessary tables in your Supabase/PostgreSQL database

-- Users table - stores Discord user information and drama stats
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  dramaPoints INTEGER DEFAULT 0,
  karma INTEGER DEFAULT 0,
  factionId TEXT,
  roleHistory JSONB DEFAULT '[]'::jsonb,
  lastActive TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  traits JSONB DEFAULT jsonb_build_object(
    'core', jsonb_build_object(
      'chaos', 0.5,
      'cooperation', 0.5,
      'performative', 0.5,
      'loyalty', 0.5,
      'saltiness', 0.5
    ),
    'style', jsonb_build_object(
      'emojiSpeak', 0.3,
      'capslock', 0.3,
      'essayMode', 0.3,
      'clown', 0.3
    ),
    'stability', jsonb_build_object(
      'volatility', 0.4,
      'dramaHalfLifeHours', 24
    ),
    'lastUpdate', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ),
  badges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Factions table - stores information about player factions
CREATE TABLE IF NOT EXISTS factions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leaderIds JSONB DEFAULT '[]'::jsonb,
  memberIds JSONB DEFAULT '[]'::jsonb,
  power INTEGER DEFAULT 0,
  entropy FLOAT DEFAULT 0,
  color TEXT DEFAULT '#7289DA',
  emoji TEXT,
  rivalFactionIds JSONB DEFAULT '[]'::jsonb,
  allyFactionIds JSONB DEFAULT '[]'::jsonb,
  dramaWins INTEGER DEFAULT 0,
  traits JSONB DEFAULT jsonb_build_object(
    'chaos', 0.5,
    'cooperation', 0.5,
    'performative', 0.5,
    'entropy', 0.5,
    'lastUpdate', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drama events table - stores history of drama events
CREATE TABLE IF NOT EXISTS drama_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  actorId TEXT,
  initiatorId TEXT,
  targetIds JSONB DEFAULT '[]'::jsonb,
  participants JSONB DEFAULT '[]'::jsonb,
  factions JSONB DEFAULT '[]'::jsonb,
  trigger TEXT,
  description TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  outcome TEXT DEFAULT '',
  resolved BOOLEAN DEFAULT FALSE,
  messageId TEXT,
  channelId TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Server settings table - per-server configuration
CREATE TABLE IF NOT EXISTS server_settings (
  guildId TEXT PRIMARY KEY,
  name TEXT,
  prefix TEXT DEFAULT '!',
  dramaThreshold INTEGER DEFAULT 5,
  enabledModules JSONB DEFAULT '["core", "drama", "factions"]'::jsonb,
  channels JSONB DEFAULT '{}'::jsonb,
  roles JSONB DEFAULT '{}'::jsonb,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_factionId ON users(factionId);
CREATE INDEX IF NOT EXISTS idx_drama_events_timestamp ON drama_events(timestamp);

-- Function to update the lastActive timestamp for users
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lastActive = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update lastActive when a user record is updated
DROP TRIGGER IF EXISTS update_user_last_active ON users;
CREATE TRIGGER update_user_last_active
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_last_active();

-- Hosted Catalyst guild installations
CREATE TABLE IF NOT EXISTS guild_installations (
  guild_id TEXT PRIMARY KEY,
  guild_name TEXT NOT NULL,
  install_state TEXT NOT NULL DEFAULT 'draft',
  announce_channel_id TEXT,
  consent_copy TEXT NOT NULL,
  quiet_hours TEXT NOT NULL DEFAULT '22:00-08:00',
  theme TEXT NOT NULL DEFAULT 'Control Room',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active and historical seasons
CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  week INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  crews JSONB NOT NULL DEFAULT '[]'::jsonb,
  join_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Explicit member participation in seasons
CREATE TABLE IF NOT EXISTS season_memberships (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  crew_id TEXT NOT NULL,
  consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  opted_out_at TIMESTAMP WITH TIME ZONE,
  score INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0
);

-- Opt-in and opt-out record history
CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  copy TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Hosted season event feed
CREATE TABLE IF NOT EXISTS season_events (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  type TEXT NOT NULL,
  actor_id TEXT,
  crew_id TEXT,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Recap and season summaries
CREATE TABLE IF NOT EXISTS season_summaries (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Runtime state snapshot for hosted deployment environments
CREATE TABLE IF NOT EXISTS catalyst_runtime_state (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasons_guild_status ON seasons(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_guild_season ON season_memberships(guild_id, season_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_guild_user ON consent_records(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_season_events_guild_created ON season_events(guild_id, created_at DESC);
