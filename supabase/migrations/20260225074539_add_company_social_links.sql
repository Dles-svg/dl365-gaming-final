/*
  # Add Company Social Media Links Support

  1. Changes
    - Add `is_company_link` column to social_media_connections table
    - Make `user_id` nullable to support company-wide links
    - Update unique constraint to allow multiple company links
    - Add policy for public access to company social links
    
  2. Security
    - Allow public read access to company social links
    - Maintain existing user-specific policies
*/

-- Add is_company_link column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_connections' AND column_name = 'is_company_link'
  ) THEN
    ALTER TABLE social_media_connections ADD COLUMN is_company_link boolean DEFAULT false;
  END IF;
END $$;

-- Make user_id nullable to support company links
DO $$
BEGIN
  ALTER TABLE social_media_connections ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Drop old unique constraint
DO $$
BEGIN
  ALTER TABLE social_media_connections DROP CONSTRAINT IF EXISTS social_media_connections_user_id_platform_key;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Add new unique constraint that allows company links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_or_company_platform'
  ) THEN
    ALTER TABLE social_media_connections 
    ADD CONSTRAINT unique_user_or_company_platform 
    UNIQUE (user_id, platform, is_company_link);
  END IF;
END $$;

-- Add policy for public access to company social links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'social_media_connections' 
    AND policyname = 'Anyone can view company social links'
  ) THEN
    CREATE POLICY "Anyone can view company social links"
      ON social_media_connections FOR SELECT
      USING (is_company_link = true AND is_active = true);
  END IF;
END $$;

-- Create index for faster company link lookups
CREATE INDEX IF NOT EXISTS idx_social_media_connections_company_links 
  ON social_media_connections(is_company_link, is_active) 
  WHERE is_company_link = true;
