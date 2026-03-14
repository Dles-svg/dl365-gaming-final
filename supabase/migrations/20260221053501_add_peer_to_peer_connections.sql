/*
  # Add Peer-to-Peer Connection System for Gamer-Miner Interactions

  1. New Tables
    - `peer_connections`
      - `id` (uuid, primary key)
      - `rental_id` (uuid, references equipment_rentals_v2)
      - `gamer_id` (uuid, references auth.users)
      - `miner_id` (uuid, references auth.users)
      - `connection_status` (text) - 'initiating', 'connected', 'disconnected', 'failed'
      - `webrtc_offer` (jsonb) - WebRTC offer data
      - `webrtc_answer` (jsonb) - WebRTC answer data
      - `ice_candidates` (jsonb) - Array of ICE candidates
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz)
      - `created_at` (timestamptz)
      
    - `peer_messages`
      - `id` (uuid, primary key)
      - `connection_id` (uuid, references peer_connections)
      - `sender_id` (uuid, references auth.users)
      - `receiver_id` (uuid, references auth.users)
      - `message` (text)
      - `message_type` (text) - 'text', 'system', 'notification'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own connections
    - Add policies for viewing and sending messages
*/

-- Create peer_connections table
CREATE TABLE IF NOT EXISTS peer_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid REFERENCES equipment_rentals_v2(id),
  gamer_id uuid REFERENCES auth.users(id) NOT NULL,
  miner_id uuid REFERENCES auth.users(id) NOT NULL,
  connection_status text DEFAULT 'initiating' CHECK (connection_status IN ('initiating', 'connected', 'disconnected', 'failed')),
  webrtc_offer jsonb DEFAULT '{}'::jsonb,
  webrtc_answer jsonb DEFAULT '{}'::jsonb,
  ice_candidates jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE peer_connections ENABLE ROW LEVEL SECURITY;

-- Create peer_messages table
CREATE TABLE IF NOT EXISTS peer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES peer_connections(id) NOT NULL,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) NOT NULL,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'notification')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE peer_messages ENABLE ROW LEVEL SECURITY;

-- Policies for peer_connections
CREATE POLICY "Users can view their own connections"
  ON peer_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = gamer_id OR auth.uid() = miner_id);

CREATE POLICY "Gamers can create connections"
  ON peer_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = gamer_id);

CREATE POLICY "Users can update their own connections"
  ON peer_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = gamer_id OR auth.uid() = miner_id)
  WITH CHECK (auth.uid() = gamer_id OR auth.uid() = miner_id);

-- Policies for peer_messages
CREATE POLICY "Users can view messages in their connections"
  ON peer_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM peer_connections
      WHERE peer_connections.id = peer_messages.connection_id
      AND (peer_connections.gamer_id = auth.uid() OR peer_connections.miner_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their connections"
  ON peer_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM peer_connections
      WHERE peer_connections.id = peer_messages.connection_id
      AND (peer_connections.gamer_id = auth.uid() OR peer_connections.miner_id = auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_peer_connections_gamer ON peer_connections(gamer_id);
CREATE INDEX IF NOT EXISTS idx_peer_connections_miner ON peer_connections(miner_id);
CREATE INDEX IF NOT EXISTS idx_peer_connections_rental ON peer_connections(rental_id);
CREATE INDEX IF NOT EXISTS idx_peer_messages_connection ON peer_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_peer_messages_created ON peer_messages(created_at DESC);