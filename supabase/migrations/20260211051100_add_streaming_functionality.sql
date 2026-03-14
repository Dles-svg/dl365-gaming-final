/*
  # Add Streaming Functionality

  1. New Tables
    - `streaming_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text) - Stream title
      - `description` (text) - Stream description
      - `game_id` (uuid, references games, nullable)
      - `stream_key` (text) - Unique stream key
      - `status` (text) - 'live', 'ended', 'scheduled'
      - `viewer_count` (integer, default 0)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on streaming_sessions table
    - Users can view all live streams
    - Users can manage their own streams
    - Users can create their own streams
*/

CREATE TABLE IF NOT EXISTS streaming_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  game_id uuid REFERENCES games ON DELETE SET NULL,
  stream_key text UNIQUE NOT NULL,
  status text DEFAULT 'scheduled',
  viewer_count integer DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE streaming_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live streams"
  ON streaming_sessions FOR SELECT
  TO authenticated
  USING (status = 'live');

CREATE POLICY "Users can view own streams"
  ON streaming_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own streams"
  ON streaming_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streams"
  ON streaming_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own streams"
  ON streaming_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
