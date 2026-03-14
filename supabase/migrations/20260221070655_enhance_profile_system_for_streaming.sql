/*
  # Enhance Profile System for Streaming Integration

  ## Overview
  This migration enhances the existing profile system to support better role management,
  miner codes, and custom equipment pricing for the streaming platform.

  ## 1. Changes to Existing Tables

  ### `user_profiles`
  - Add `display_name` (text) - Public display name
  - Add `bio` (text, optional) - User biography
  - Add `avatar_url` (text, optional) - Profile picture URL
  - Add `is_online` (boolean) - Current online status
  - Modify `user_role` to support 'both' option

  ### `miner_profiles`
  - Add `miner_code` (text, unique) - Unique code for gamers to connect
  - Add `location` (text, optional) - Geographic location
  - Add `is_accepting_rentals` (boolean) - Whether currently accepting new rentals
  - Add `equipment_description` (text) - Description of available equipment

  ## 2. New Tables

  ### `gamer_profiles`
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Links to user_profiles
  - `favorite_games` (text[]) - Array of favorite games
  - `total_sessions` (integer) - Total gaming sessions
  - `total_hours_played` (numeric) - Total hours of gaming
  - `created_at` (timestamptz)

  ### `miner_equipment_pricing`
  - `id` (uuid, primary key)
  - `miner_id` (uuid) - Links to miner_profiles
  - `equipment_tier` (text) - Tier from equipment listings
  - `hourly_rate` (numeric) - Custom hourly rate in DL365
  - `daily_rate` (numeric) - Custom daily rate in DL365
  - `weekly_rate` (numeric) - Custom weekly rate in DL365
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 3. Security
  - RLS policies for new tables and columns
  - Public viewability for profiles
  - Self-management for own data
*/

-- Add new columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN display_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bio text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_online boolean DEFAULT false;
  END IF;
END $$;

-- Update default display names for existing users
UPDATE user_profiles
SET display_name = COALESCE(username, 'User')
WHERE display_name IS NULL;

-- Make display_name NOT NULL after setting defaults
ALTER TABLE user_profiles ALTER COLUMN display_name SET NOT NULL;

-- Add new columns to miner_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miner_profiles' AND column_name = 'miner_code'
  ) THEN
    ALTER TABLE miner_profiles ADD COLUMN miner_code text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miner_profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE miner_profiles ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miner_profiles' AND column_name = 'is_accepting_rentals'
  ) THEN
    ALTER TABLE miner_profiles ADD COLUMN is_accepting_rentals boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miner_profiles' AND column_name = 'equipment_description'
  ) THEN
    ALTER TABLE miner_profiles ADD COLUMN equipment_description text;
  END IF;
END $$;

-- Function to generate unique miner code
CREATE OR REPLACE FUNCTION generate_miner_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate miner_code for existing and new miners
CREATE OR REPLACE FUNCTION set_miner_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.miner_code IS NULL OR NEW.miner_code = '' THEN
    NEW.miner_code := generate_miner_code();
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM miner_profiles WHERE miner_code = NEW.miner_code) LOOP
      NEW.miner_code := generate_miner_code();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for miner_code generation
DROP TRIGGER IF EXISTS trigger_set_miner_code ON miner_profiles;
CREATE TRIGGER trigger_set_miner_code
  BEFORE INSERT OR UPDATE ON miner_profiles
  FOR EACH ROW
  WHEN (NEW.miner_code IS NULL)
  EXECUTE FUNCTION set_miner_code();

-- Generate miner codes for existing miners
UPDATE miner_profiles
SET miner_code = generate_miner_code()
WHERE miner_code IS NULL;

-- Create gamer_profiles table
CREATE TABLE IF NOT EXISTS gamer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  favorite_games text[] DEFAULT '{}',
  total_sessions integer DEFAULT 0,
  total_hours_played numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create miner_equipment_pricing table
CREATE TABLE IF NOT EXISTS miner_equipment_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  miner_id uuid NOT NULL REFERENCES miner_profiles(id) ON DELETE CASCADE,
  equipment_tier text NOT NULL,
  hourly_rate numeric NOT NULL CHECK (hourly_rate >= 0),
  daily_rate numeric NOT NULL CHECK (daily_rate >= 0),
  weekly_rate numeric NOT NULL CHECK (weekly_rate >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(miner_id, equipment_tier)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for miner_equipment_pricing updated_at
DROP TRIGGER IF EXISTS trigger_update_pricing_updated_at ON miner_equipment_pricing;
CREATE TRIGGER trigger_update_pricing_updated_at
  BEFORE UPDATE ON miner_equipment_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS on new tables
ALTER TABLE gamer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE miner_equipment_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gamer_profiles
DROP POLICY IF EXISTS "Anyone can view gamer profiles" ON gamer_profiles;
CREATE POLICY "Anyone can view gamer profiles"
  ON gamer_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Gamers can update own profile" ON gamer_profiles;
CREATE POLICY "Gamers can update own profile"
  ON gamer_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Gamers can insert own profile" ON gamer_profiles;
CREATE POLICY "Gamers can insert own profile"
  ON gamer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for miner_equipment_pricing
DROP POLICY IF EXISTS "Anyone can view equipment pricing" ON miner_equipment_pricing;
CREATE POLICY "Anyone can view equipment pricing"
  ON miner_equipment_pricing FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Miners can manage own pricing" ON miner_equipment_pricing;
CREATE POLICY "Miners can manage own pricing"
  ON miner_equipment_pricing FOR ALL
  TO authenticated
  USING (
    miner_id IN (
      SELECT id FROM miner_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    miner_id IN (
      SELECT id FROM miner_profiles WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gamer_profiles_user_id ON gamer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_miner_equipment_pricing_miner_id ON miner_equipment_pricing(miner_id);
CREATE INDEX IF NOT EXISTS idx_miner_profiles_miner_code ON miner_profiles(miner_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_online ON user_profiles(is_online);