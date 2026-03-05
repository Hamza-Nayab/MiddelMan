-- Track total number of username changes
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_change_count INTEGER NOT NULL DEFAULT 0;
