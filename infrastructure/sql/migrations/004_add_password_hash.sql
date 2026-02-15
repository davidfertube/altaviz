BEGIN;

ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

COMMENT ON COLUMN users.password_hash IS 'bcrypt hash; NULL for OAuth-only users';

COMMIT;
