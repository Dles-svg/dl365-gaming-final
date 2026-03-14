/*
  # Create Masking Information Table

  1. New Tables
    - `masking_info`
      - `id` (uuid, primary key) - Unique identifier for each masking entry
      - `title` (text) - Title of the masking information
      - `description` (text) - Detailed description of the masking
      - `keywords` (text[]) - Array of keywords associated with the masking
      - `user_id` (uuid) - Reference to the user who created the entry
      - `created_at` (timestamptz) - Timestamp when the entry was created
      - `updated_at` (timestamptz) - Timestamp when the entry was last updated

  2. Security
    - Enable RLS on `masking_info` table
    - Add policy for authenticated users to read their own masking entries
    - Add policy for authenticated users to insert their own masking entries
    - Add policy for authenticated users to update their own masking entries
    - Add policy for authenticated users to delete their own masking entries

  3. Notes
    - The keywords field uses a text array to store multiple keywords
    - Updated_at is automatically set to the current timestamp on updates
*/

-- Create masking_info table
CREATE TABLE IF NOT EXISTS masking_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  keywords text[] DEFAULT ARRAY[]::text[],
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE masking_info ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own masking info"
  ON masking_info FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own masking info"
  ON masking_info FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own masking info"
  ON masking_info FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own masking info"
  ON masking_info FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_masking_info_user_id ON masking_info(user_id);
CREATE INDEX IF NOT EXISTS idx_masking_info_created_at ON masking_info(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_masking_info_updated_at BEFORE UPDATE ON masking_info
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();