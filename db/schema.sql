CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL CHECK (length(trim(username)) > 0),
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS boards (
  id BIGSERIAL PRIMARY KEY,
  board_code VARCHAR(12) UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Shared List',
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_members (
  board_id BIGINT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  board_id BIGINT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  target_price NUMERIC(12,2) NOT NULL CHECK (target_price > 0),
  market_price NUMERIC(12,2),
  savings_daily NUMERIC(12,2),
  savings_weekly NUMERIC(12,2),
  start_date DATE,
  end_date DATE,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis_summary TEXT,
  analysis_recommendation TEXT,
  added_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_board_id ON items(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);
