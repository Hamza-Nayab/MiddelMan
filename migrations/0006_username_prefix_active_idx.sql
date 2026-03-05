CREATE INDEX IF NOT EXISTS users_username_prefix_active_idx
ON users (lower(username) text_pattern_ops)
WHERE role = 'seller' AND is_disabled = false;
