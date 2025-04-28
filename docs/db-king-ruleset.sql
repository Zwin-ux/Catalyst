CREATE TABLE IF NOT EXISTS king_rulesets (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  window_minutes INTEGER NOT NULL,
  metric VARCHAR(30) NOT NULL,
  reward_type VARCHAR(20) NOT NULL,
  reward_value VARCHAR(100) NOT NULL,
  announcement TEXT NOT NULL,
  eligible_role VARCHAR(100),
  min_participation INTEGER
);
