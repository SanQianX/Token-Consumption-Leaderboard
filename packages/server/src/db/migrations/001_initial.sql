-- 001_initial.sql
-- Token Consumption Leaderboard v2 - Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Submission type enum
CREATE TYPE submission_type AS ENUM ('daily', 'monthly', 'session', 'blocks');

-- Auth provider enum
CREATE TYPE auth_provider AS ENUM ('github', 'email', 'both');

-- ============================================
-- Users table
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  email VARCHAR(255) UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  password_hash TEXT,
  github_id INTEGER UNIQUE,
  auth_provider auth_provider DEFAULT 'email',
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Email verification codes
-- ============================================
CREATE TABLE email_verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_email ON email_verification_codes(email);
CREATE INDEX idx_verification_codes_expires ON email_verification_codes(expires_at);

-- ============================================
-- API tokens (for background auto-submit)
-- ============================================
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  token_prefix VARCHAR(10) NOT NULL,
  name VARCHAR(100) DEFAULT 'default',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
CREATE INDEX idx_api_tokens_prefix ON api_tokens(token_prefix);

-- ============================================
-- Data submissions
-- ============================================
CREATE TABLE data_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_type submission_type NOT NULL,
  payload JSONB NOT NULL,
  data_hash VARCHAR(64) UNIQUE NOT NULL,
  total_tokens BIGINT DEFAULT 0,
  total_cost DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_user ON data_submissions(user_id);
CREATE INDEX idx_submissions_type ON data_submissions(submission_type);
CREATE INDEX idx_submissions_created ON data_submissions(created_at);

-- ============================================
-- User summaries (denormalized for performance)
-- ============================================
CREATE TABLE user_summaries (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_tokens_all BIGINT DEFAULT 0,
  cost_all DOUBLE PRECISION DEFAULT 0,
  total_tokens_30d BIGINT DEFAULT 0,
  cost_30d DOUBLE PRECISION DEFAULT 0,
  total_tokens_7d BIGINT DEFAULT 0,
  cost_7d DOUBLE PRECISION DEFAULT 0,
  total_tokens_1d BIGINT DEFAULT 0,
  cost_1d DOUBLE PRECISION DEFAULT 0,
  last_submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Leaderboard cache
-- ============================================
CREATE TABLE leaderboard_cache (
  period VARCHAR(20) PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize cache rows
INSERT INTO leaderboard_cache (period, data) VALUES
  ('all_time', '[]'),
  ('30d', '[]'),
  ('7d', '[]'),
  ('1d', '[]');

-- ============================================
-- Views
-- ============================================
CREATE OR REPLACE VIEW leaderboard_all_time AS
SELECT
  RANK() OVER (ORDER BY s.total_tokens_all DESC) AS rank,
  u.username,
  u.display_name,
  u.avatar_url,
  s.total_tokens_all AS total_tokens,
  s.cost_all AS total_cost
FROM user_summaries s
JOIN users u ON u.id = s.user_id
WHERE s.total_tokens_all > 0;

CREATE OR REPLACE VIEW leaderboard_30d AS
SELECT
  RANK() OVER (ORDER BY s.total_tokens_30d DESC) AS rank,
  u.username,
  u.display_name,
  u.avatar_url,
  s.total_tokens_30d AS total_tokens,
  s.cost_30d AS total_cost
FROM user_summaries s
JOIN users u ON u.id = s.user_id
WHERE s.total_tokens_30d > 0;

CREATE OR REPLACE VIEW leaderboard_7d AS
SELECT
  RANK() OVER (ORDER BY s.total_tokens_7d DESC) AS rank,
  u.username,
  u.display_name,
  u.avatar_url,
  s.total_tokens_7d AS total_tokens,
  s.cost_7d AS total_cost
FROM user_summaries s
JOIN users u ON u.id = s.user_id
WHERE s.total_tokens_7d > 0;

CREATE OR REPLACE VIEW leaderboard_1d AS
SELECT
  RANK() OVER (ORDER BY s.total_tokens_1d DESC) AS rank,
  u.username,
  u.display_name,
  u.avatar_url,
  s.total_tokens_1d AS total_tokens,
  s.cost_1d AS total_cost
FROM user_summaries s
JOIN users u ON u.id = s.user_id
WHERE s.total_tokens_1d > 0;

-- ============================================
-- Trigger: auto-update user_summaries on INSERT
-- ============================================
CREATE OR REPLACE FUNCTION update_user_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_summaries (user_id, total_tokens_all, cost_all, last_submitted_at)
  VALUES (
    NEW.user_id,
    NEW.total_tokens,
    NEW.total_cost,
    NEW.created_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_tokens_all = (
      SELECT COALESCE(SUM(total_tokens), 0) FROM data_submissions WHERE user_id = NEW.user_id
    ),
    cost_all = (
      SELECT COALESCE(SUM(total_cost), 0) FROM data_submissions WHERE user_id = NEW.user_id
    ),
    total_tokens_30d = (
      SELECT COALESCE(SUM(total_tokens), 0) FROM data_submissions
      WHERE user_id = NEW.user_id AND created_at >= NOW() - INTERVAL '30 days'
    ),
    cost_30d = (
      SELECT COALESCE(SUM(total_cost), 0) FROM data_submissions
      WHERE user_id = NEW.user_id AND created_at >= NOW() - INTERVAL '30 days'
    ),
    total_tokens_7d = (
      SELECT COALESCE(SUM(total_tokens), 0) FROM data_submissions
      WHERE user_id = NEW.user_id AND created_at >= NOW() - INTERVAL '7 days'
    ),
    cost_7d = (
      SELECT COALESCE(SUM(total_cost), 0) FROM data_submissions
      WHERE user_id = NEW.user_id AND created_at >= NOW() - INTERVAL '7 days'
    ),
    total_tokens_1d = (
      SELECT COALESCE(SUM(total_tokens), 0) FROM data_submissions
      WHERE user_id = NEW.user_id AND created_at >= NOW() - INTERVAL '1 day'
    ),
    cost_1d = (
      SELECT COALESCE(SUM(total_cost), 0) FROM data_submissions
      WHERE user_id = NEW.user_id AND created_at >= NOW() - INTERVAL '1 day'
    ),
    last_submitted_at = NEW.created_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_summary
  AFTER INSERT ON data_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_summary();

-- ============================================
-- Updated_at trigger for users table
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
