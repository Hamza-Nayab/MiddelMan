-- Enable trigram support for fast ILIKE/LIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- users.username: supports ILIKE '%term%' and prefix/exact variants
CREATE INDEX IF NOT EXISTS users_username_trgm_idx
  ON users
  USING gin (username gin_trgm_ops);

-- profiles.display_name: supports ILIKE '%term%' against seller display names
CREATE INDEX IF NOT EXISTS profiles_display_name_trgm_idx
  ON profiles
  USING gin (display_name gin_trgm_ops);

-- profiles.contact_email: contact email lives on profiles table
-- (not users.contact_email)
CREATE INDEX IF NOT EXISTS profiles_contact_email_trgm_idx
  ON profiles
  USING gin (contact_email gin_trgm_ops);
