-- Initialize database schema for Hashbase

-- Create gmail_tokens table for persistent OAuth token storage
CREATE TABLE IF NOT EXISTS gmail_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) DEFAULT 'default_user',
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50),
    expiry_date BIGINT,
    scope TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_user_id ON gmail_tokens(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_gmail_tokens_updated_at 
    BEFORE UPDATE ON gmail_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a comment for documentation
COMMENT ON TABLE gmail_tokens IS 'Stores Gmail OAuth tokens for persistent authentication across server restarts';
COMMENT ON COLUMN gmail_tokens.user_id IS 'User identifier (default: default_user for single-user setup)';
COMMENT ON COLUMN gmail_tokens.access_token IS 'OAuth2 access token for Gmail API';
COMMENT ON COLUMN gmail_tokens.refresh_token IS 'OAuth2 refresh token for obtaining new access tokens';
COMMENT ON COLUMN gmail_tokens.expiry_date IS 'Unix timestamp (milliseconds) when access token expires';
