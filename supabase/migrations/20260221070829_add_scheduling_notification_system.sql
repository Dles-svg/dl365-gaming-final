/*
  # Scheduling and Notification System

  ## Overview
  This migration creates a comprehensive scheduling and notification system for
  equipment rentals, streaming sessions, and user-to-user communications.

  ## 1. New Tables

  ### `rental_schedules`
  - `id` (uuid, primary key)
  - `miner_profile_id` (uuid) - Links to miner_profiles
  - `gamer_profile_id` (uuid) - Links to gamer_profiles
  - `scheduled_start` (timestamptz) - When rental is scheduled to start
  - `scheduled_end` (timestamptz) - When rental is scheduled to end
  - `equipment_tier` (text) - Tier of equipment
  - `total_cost` (numeric) - Total cost in DL365
  - `miner_code` (text) - Code for connection
  - `status` (text) - pending, confirmed, active, completed, cancelled
  - `miner_notified` (boolean) - Whether miner was notified
  - `gamer_notified` (boolean) - Whether gamer was notified
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Recipient user
  - `title` (text) - Notification title
  - `message` (text) - Notification message
  - `type` (text) - rental_starting, rental_ending, connection_request, payment, etc.
  - `reference_id` (uuid, optional) - Links to related record
  - `read` (boolean) - Whether notification was read
  - `created_at` (timestamptz)

  ### `connection_requests`
  - `id` (uuid, primary key)
  - `gamer_id` (uuid) - Gamer requesting connection
  - `miner_id` (uuid) - Miner being requested
  - `miner_code` (text) - Code entered by gamer
  - `status` (text) - pending, accepted, rejected, expired
  - `message` (text, optional) - Message from gamer
  - `created_at` (timestamptz)
  - `expires_at` (timestamptz) - When request expires

  ## 2. Functions
  - Auto-notify users before rental starts (15 min warning)
  - Auto-notify when connection request is made
  - Update notification counts in real-time

  ## 3. Security
  - RLS on all tables
  - Users can only see their own notifications
  - Miners can see connection requests to them
  - Gamers can see their own connection requests
*/

-- Create rental_schedules table
CREATE TABLE IF NOT EXISTS rental_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  miner_profile_id uuid NOT NULL REFERENCES miner_profiles(id) ON DELETE CASCADE,
  gamer_profile_id uuid NOT NULL REFERENCES gamer_profiles(id) ON DELETE CASCADE,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  equipment_tier text NOT NULL,
  total_cost numeric NOT NULL CHECK (total_cost >= 0),
  miner_code text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  miner_notified boolean DEFAULT false,
  gamer_notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('rental_starting', 'rental_ending', 'connection_request', 'payment', 'review', 'system', 'chat')),
  reference_id uuid,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create connection_requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gamer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  miner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  miner_code text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  message text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 minutes')
);

-- Trigger for rental_schedules updated_at
DROP TRIGGER IF EXISTS trigger_update_rental_schedules_updated_at ON rental_schedules;
CREATE TRIGGER trigger_update_rental_schedules_updated_at
  BEFORE UPDATE ON rental_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to create notifications for upcoming rentals
CREATE OR REPLACE FUNCTION notify_upcoming_rental()
RETURNS void AS $$
DECLARE
  rental RECORD;
  miner_user_id uuid;
  gamer_user_id uuid;
BEGIN
  -- Find rentals starting in 15 minutes that haven't been notified
  FOR rental IN
    SELECT *
    FROM rental_schedules
    WHERE status = 'confirmed'
    AND scheduled_start <= (now() + interval '15 minutes')
    AND scheduled_start > now()
    AND (miner_notified = false OR gamer_notified = false)
  LOOP
    -- Get user IDs
    SELECT user_id INTO miner_user_id FROM miner_profiles WHERE id = rental.miner_profile_id;
    SELECT user_id INTO gamer_user_id FROM gamer_profiles WHERE id = rental.gamer_profile_id;

    -- Notify miner
    IF NOT rental.miner_notified THEN
      INSERT INTO notifications (user_id, title, message, type, reference_id)
      VALUES (
        miner_user_id,
        'Rental Starting Soon',
        'Your equipment rental starts in 15 minutes. Please ensure your equipment is ready.',
        'rental_starting',
        rental.id
      );
      
      UPDATE rental_schedules
      SET miner_notified = true
      WHERE id = rental.id;
    END IF;

    -- Notify gamer
    IF NOT rental.gamer_notified THEN
      INSERT INTO notifications (user_id, title, message, type, reference_id)
      VALUES (
        gamer_user_id,
        'Rental Starting Soon',
        'Your equipment rental starts in 15 minutes. Miner Code: ' || rental.miner_code,
        'rental_starting',
        rental.id
      );
      
      UPDATE rental_schedules
      SET gamer_notified = true
      WHERE id = rental.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to handle connection requests
CREATE OR REPLACE FUNCTION handle_connection_request()
RETURNS trigger AS $$
DECLARE
  miner_user_id uuid;
  gamer_display_name text;
BEGIN
  -- Get miner user ID
  SELECT user_id INTO miner_user_id
  FROM miner_profiles
  WHERE miner_code = NEW.miner_code
  LIMIT 1;

  -- Get gamer display name
  SELECT display_name INTO gamer_display_name
  FROM user_profiles
  WHERE id = NEW.gamer_id;

  -- Notify miner of connection request
  INSERT INTO notifications (user_id, title, message, type, reference_id)
  VALUES (
    miner_user_id,
    'New Connection Request',
    gamer_display_name || ' wants to connect to your equipment.',
    'connection_request',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for connection request notifications
DROP TRIGGER IF EXISTS trigger_connection_request_notification ON connection_requests;
CREATE TRIGGER trigger_connection_request_notification
  AFTER INSERT ON connection_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION handle_connection_request();

-- Function to auto-expire old connection requests
CREATE OR REPLACE FUNCTION expire_old_connection_requests()
RETURNS void AS $$
BEGIN
  UPDATE connection_requests
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE rental_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rental_schedules
DROP POLICY IF EXISTS "Users can view own rentals" ON rental_schedules;
CREATE POLICY "Users can view own rentals"
  ON rental_schedules FOR SELECT
  TO authenticated
  USING (
    miner_profile_id IN (SELECT id FROM miner_profiles WHERE user_id = auth.uid())
    OR gamer_profile_id IN (SELECT id FROM gamer_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Gamers can create rentals" ON rental_schedules;
CREATE POLICY "Gamers can create rentals"
  ON rental_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    gamer_profile_id IN (SELECT id FROM gamer_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own rentals" ON rental_schedules;
CREATE POLICY "Users can update own rentals"
  ON rental_schedules FOR UPDATE
  TO authenticated
  USING (
    miner_profile_id IN (SELECT id FROM miner_profiles WHERE user_id = auth.uid())
    OR gamer_profile_id IN (SELECT id FROM gamer_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    miner_profile_id IN (SELECT id FROM miner_profiles WHERE user_id = auth.uid())
    OR gamer_profile_id IN (SELECT id FROM gamer_profiles WHERE user_id = auth.uid())
  );

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for connection_requests
DROP POLICY IF EXISTS "Users can view relevant connection requests" ON connection_requests;
CREATE POLICY "Users can view relevant connection requests"
  ON connection_requests FOR SELECT
  TO authenticated
  USING (gamer_id = auth.uid() OR miner_id = auth.uid());

DROP POLICY IF EXISTS "Gamers can create connection requests" ON connection_requests;
CREATE POLICY "Gamers can create connection requests"
  ON connection_requests FOR INSERT
  TO authenticated
  WITH CHECK (gamer_id = auth.uid());

DROP POLICY IF EXISTS "Miners can update connection requests" ON connection_requests;
CREATE POLICY "Miners can update connection requests"
  ON connection_requests FOR UPDATE
  TO authenticated
  USING (miner_id = auth.uid())
  WITH CHECK (miner_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_schedules_miner_profile_id ON rental_schedules(miner_profile_id);
CREATE INDEX IF NOT EXISTS idx_rental_schedules_gamer_profile_id ON rental_schedules(gamer_profile_id);
CREATE INDEX IF NOT EXISTS idx_rental_schedules_scheduled_start ON rental_schedules(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_rental_schedules_status ON rental_schedules(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_requests_gamer_id ON connection_requests(gamer_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_miner_id ON connection_requests(miner_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status);