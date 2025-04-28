-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY, -- Discord User ID
  display_name VARCHAR(100) NOT NULL,
  team_id VARCHAR(32),
  karma INTEGER DEFAULT 0,
  social_stats JSONB DEFAULT '{}' -- For extensible per-user stats
);

-- Detailed user stats for analytics/leaderboards
CREATE TABLE IF NOT EXISTS user_stats (
  user_id VARCHAR(32) REFERENCES users(id),
  messages_sent INTEGER DEFAULT 0,
  voice_minutes INTEGER DEFAULT 0,
  reactions_given INTEGER DEFAULT 0,
  reactions_received INTEGER DEFAULT 0,
  events_participated INTEGER DEFAULT 0,
  helpful_marks INTEGER DEFAULT 0,
  warns INTEGER DEFAULT 0,
  mutes INTEGER DEFAULT 0,
  kicks INTEGER DEFAULT 0,
  bans INTEGER DEFAULT 0,
  PRIMARY KEY(user_id)
);

-- Factions table for drama coliseum
CREATE TABLE IF NOT EXISTS factions (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  emoji VARCHAR(10),
  color VARCHAR(7),
  created_by VARCHAR(32) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User-faction membership
CREATE TABLE IF NOT EXISTS user_factions (
  user_id VARCHAR(32) REFERENCES users(id),
  faction_id UUID REFERENCES factions(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(user_id)
);

-- Persistent drama alliances/rivalries
CREATE TABLE IF NOT EXISTS drama_alliances (
  id UUID PRIMARY KEY,
  user_a VARCHAR(32) REFERENCES users(id),
  user_b VARCHAR(32) REFERENCES users(id),
  type VARCHAR(16) CHECK (type IN ('alliance', 'rivalry')),
  drama_score INTEGER DEFAULT 0,
  last_interaction TIMESTAMP DEFAULT NOW()
);

-- Drama and event log
CREATE TABLE IF NOT EXISTS drama_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(32),
  user_a VARCHAR(32),
  user_b VARCHAR(32),
  faction_a UUID,
  faction_b UUID,
  score INTEGER,
  event_time TIMESTAMP DEFAULT NOW(),
  details JSONB
);


CREATE TABLE IF NOT EXISTS point_events (
  id UUID PRIMARY KEY,
  user_id VARCHAR(32) REFERENCES users(id),
  type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS king_of_hill (
  period_start TIMESTAMP PRIMARY KEY,
  user_id VARCHAR(32) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  participants TEXT[] -- Array of user IDs
);
