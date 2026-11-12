-- Run once in the Cloudflare D1 console before enabling the leaderboard.
CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  first_name TEXT NOT NULL CHECK (length(first_name) BETWEEN 1 AND 30),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS scores_by_quiz ON scores (quiz_id, score DESC, created_at, id);

-- A cancellation receipt also prevents a delayed/retried submission reappearing.
CREATE TABLE IF NOT EXISTS withdrawn_receipts (
  token_hash TEXT PRIMARY KEY
);
