/*
  # Add Facebook to Allowed Platforms
  
  1. Changes
    - Update the platform check constraint to include 'Facebook' (capitalized)
    - This allows Facebook to be added as a social media connection
    
  2. Notes
    - The original constraint only allowed lowercase platform names
    - Adding Facebook with capital F to match user input
*/

-- Drop the old constraint
ALTER TABLE social_media_connections DROP CONSTRAINT IF EXISTS social_media_connections_platform_check;

-- Add new constraint with Facebook included
ALTER TABLE social_media_connections 
ADD CONSTRAINT social_media_connections_platform_check 
CHECK (platform IN ('twitter', 'x', 'tiktok', 'instagram', 'youtube', 'twitch', 'facebook', 'Facebook', 'Twitter', 'X', 'TikTok', 'Instagram', 'YouTube', 'Twitch', 'Discord', 'discord', 'LinkedIn', 'linkedin'));
