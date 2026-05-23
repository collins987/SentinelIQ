-- Add email verification timestamp to users table
-- Safe to run multiple times
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
