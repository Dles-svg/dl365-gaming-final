/*
  # Add Social Media Connections System

  1. New Tables
    - `social_media_connections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `platform` (text) - e.g., 'twitter', 'tiktok', 'instagram', 'youtube', 'twitch'
      - `platform_user_id` (text) - User ID on the platform
      - `platform_username` (text) - Username/handle on the platform
      - `profile_url` (text) - Full profile URL
      - `access_token` (text, encrypted) - OAuth access token
      - `refresh_token` (text, encrypted) - OAuth refresh token
      - `token_expires_at` (timestamptz) - When the access token expires
      - `is_active` (boolean) - Whether the connection is still valid
      - `followers_count` (integer) - Number of followers
      - `last_synced_at` (timestamptz) - Last time data was synced
      - `metadata` (jsonb) - Additional platform-specific data
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `social_media_connections` table
    - Add policies for users to manage their own social media connections
*/

-- Create social_media_connections table
CREATE TABLE IF NOT EXISTS social_media_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('twitter', 'x', 'tiktok', 'instagram', 'youtube', 'twitch', 'facebook')),
  platform_user_id text,
  platform_username text NOT NULL,
  profile_url text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_active boolean DEFAULT true,
  followers_count integer DEFAULT 0,
  last_synced_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE social_media_connections ENABLE ROW LEVEL SECURITY;

-- Policies for social_media_connections
CREATE POLICY "Users can view own social connections"
  ON social_media_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social connections"
  ON social_media_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social connections"
  ON social_media_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own social connections"
  ON social_media_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_social_media_connections_user_id 
  ON social_media_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_social_media_connections_platform 
  ON social_media_connections(user_id, platform);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_social_media_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_social_media_connections_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_social_media_connections_updated_at_trigger
      BEFORE UPDATE ON social_media_connections
      FOR EACH ROW
      EXECUTE FUNCTION update_social_media_connections_updated_at();
  END IF;
END $$;
