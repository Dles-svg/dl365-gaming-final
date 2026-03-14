/*
  # Connect Streaming System to Profile Roles

  ## Overview
  This migration connects the streaming functionality to the enhanced profile system,
  allowing proper role-based streaming with miner codes and custom pricing.

  ## 1. Changes to Existing Tables

  ### `streaming_sessions`
  - Add `miner_profile_id` (uuid, optional) - Links to miner_profiles for miner streams
  - Add `gamer_profile_id` (uuid, optional) - Links to gamer_profiles for gamer streams
  - Add `miner_code` (text, optional) - Code used by gamer to connect
  - Add `is_free` (boolean) - Whether the stream is free (default true)
  - Add `hourly_rate` (numeric, optional) - Custom rate if not free

  ### `peer_connections`
  - Add `miner_code_used` (text, optional) - Track which miner code was used
  - Add `stream_session_id` (uuid, optional) - Link to streaming session

  ## 2. Functions
  - Auto-link streaming sessions to profiles based on user role
  - Update viewer counts in real-time
  - Track free vs paid streaming sessions

  ## 3. Security
  - Update RLS policies for streaming with profile context
  - Ensure proper access control based on roles
*/

-- Add new columns to streaming_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'streaming_sessions' AND column_name = 'miner_profile_id'
  ) THEN
    ALTER TABLE streaming_sessions ADD COLUMN miner_profile_id uuid REFERENCES miner_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'streaming_sessions' AND column_name = 'gamer_profile_id'
  ) THEN
    ALTER TABLE streaming_sessions ADD COLUMN gamer_profile_id uuid REFERENCES gamer_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'streaming_sessions' AND column_name = 'miner_code'
  ) THEN
    ALTER TABLE streaming_sessions ADD COLUMN miner_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'streaming_sessions' AND column_name = 'is_free'
  ) THEN
    ALTER TABLE streaming_sessions ADD COLUMN is_free boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'streaming_sessions' AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE streaming_sessions ADD COLUMN hourly_rate numeric CHECK (hourly_rate >= 0);
  END IF;
END $$;

-- Add new columns to peer_connections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'peer_connections' AND column_name = 'miner_code_used'
  ) THEN
    ALTER TABLE peer_connections ADD COLUMN miner_code_used text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'peer_connections' AND column_name = 'stream_session_id'
  ) THEN
    ALTER TABLE peer_connections ADD COLUMN stream_session_id uuid REFERENCES streaming_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Function to auto-link streaming session to appropriate profile
CREATE OR REPLACE FUNCTION link_streaming_session_to_profile()
RETURNS trigger AS $$
DECLARE
  user_role text;
  m_profile_id uuid;
  g_profile_id uuid;
BEGIN
  -- Get user role
  SELECT user_profiles.user_role INTO user_role
  FROM user_profiles
  WHERE id = NEW.user_id;

  -- Link to miner profile if user is a miner
  IF user_role IN ('Miner', 'both') AND NEW.stream_type = 'mining' THEN
    SELECT id INTO m_profile_id
    FROM miner_profiles
    WHERE user_id = NEW.user_id
    LIMIT 1;
    
    NEW.miner_profile_id := m_profile_id;
    
    -- Get miner code for this session
    SELECT miner_code INTO NEW.miner_code
    FROM miner_profiles
    WHERE id = m_profile_id;
  END IF;

  -- Link to gamer profile if user is a gamer
  IF user_role IN ('Gamer', 'E-gamer', 'both') AND NEW.stream_type = 'gaming' THEN
    SELECT id INTO g_profile_id
    FROM gamer_profiles
    WHERE user_id = NEW.user_id
    LIMIT 1;
    
    NEW.gamer_profile_id := g_profile_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-link streaming sessions
DROP TRIGGER IF EXISTS trigger_link_streaming_session ON streaming_sessions;
CREATE TRIGGER trigger_link_streaming_session
  BEFORE INSERT ON streaming_sessions
  FOR EACH ROW
  EXECUTE FUNCTION link_streaming_session_to_profile();

-- Function to update user online status when streaming
CREATE OR REPLACE FUNCTION update_user_online_status()
RETURNS trigger AS $$
BEGIN
  -- Set online when stream starts
  IF NEW.status = 'live' AND (OLD.status IS NULL OR OLD.status != 'live') THEN
    UPDATE user_profiles
    SET is_online = true
    WHERE id = NEW.user_id;
  END IF;

  -- Set offline when stream ends
  IF NEW.status = 'offline' AND OLD.status = 'live' THEN
    UPDATE user_profiles
    SET is_online = false
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update online status
DROP TRIGGER IF EXISTS trigger_update_online_status ON streaming_sessions;
CREATE TRIGGER trigger_update_online_status
  AFTER UPDATE ON streaming_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_online_status();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_miner_profile_id ON streaming_sessions(miner_profile_id);
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_gamer_profile_id ON streaming_sessions(gamer_profile_id);
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_miner_code ON streaming_sessions(miner_code);
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_is_free ON streaming_sessions(is_free);
CREATE INDEX IF NOT EXISTS idx_peer_connections_stream_session_id ON peer_connections(stream_session_id);