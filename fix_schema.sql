-- Update all existing users with role 'user' to 'buyer'
UPDATE users SET role = 'buyer' WHERE role::text = 'user';

-- Add the lastUsernameChangedAt column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_username_changed_at TIMESTAMP WITH TIME ZONE;

-- Track total number of username changes
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_change_count INTEGER NOT NULL DEFAULT 0;

-- Update the enum type to include 'buyer' instead of 'user' if needed
-- First, create the new enum type
CREATE TYPE user_role_new AS ENUM ('buyer', 'seller', 'admin');

-- Alter the column to use the new enum type
ALTER TABLE users ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;

-- Drop the old enum type
DROP TYPE user_role;

-- Rename the new enum type to the original name
ALTER TYPE user_role_new RENAME TO user_role;

-- Daily profile analytics (views/clicks)
CREATE TABLE IF NOT EXISTS profile_daily_stats (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	day DATE NOT NULL,
	views INTEGER NOT NULL DEFAULT 0,
	clicks INTEGER NOT NULL DEFAULT 0,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS profile_daily_stats_user_day_idx
	ON profile_daily_stats (user_id, day);

-- Functional index for case-insensitive username lookups
-- Used by: GET /api/profile/:username and GET /api/profile/:username/bundle
-- Improves performance of WHERE lower(username) = lower(?) queries
CREATE INDEX IF NOT EXISTS users_username_lower_idx
	ON users (lower(username));
