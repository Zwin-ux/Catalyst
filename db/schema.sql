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
  traits JSONB DEFAULT '[]'::jsonb,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drama events table - stores history of drama events
CREATE TABLE IF NOT EXISTS drama_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
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
