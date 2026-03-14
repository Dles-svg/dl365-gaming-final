/*
  # Add LinkedIn to Social Media Platforms

  1. Changes
    - Update platform check constraint to include 'linkedin'
*/

-- Drop old constraint
DO $$
BEGIN
  ALTER TABLE social_media_connections DROP CONSTRAINT IF EXISTS social_media_connections_platform_check;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Add new constraint with LinkedIn
DO $$
BEGIN
  ALTER TABLE social_media_connections 
  ADD CONSTRAINT social_media_connections_platform_check 
  CHECK (platform IN ('twitter', 'x', 'tiktok', 'instagram', 'youtube', 'twitch', 'facebook', 'linkedin'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
