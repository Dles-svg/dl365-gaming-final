/*
  # Enhance Gaming System with Local and Cloud Gaming

  1. Changes to Existing Tables
    - Add new columns to `games` table
      - `game_type` (text) - 'local' or 'cloud' or 'both'
      - `executable_path` (text) - Path to game executable for local games
      - `min_specs` (jsonb) - Minimum system requirements
      - `recommended_specs` (jsonb) - Recommended system requirements
      - `updated_at` (timestamptz) - Last update timestamp
    
    - Add new columns to `game_sessions` table
      - `equipment_rental_id` (uuid, references equipment_rentals_v2)
      - `session_type` (text) - 'local' or 'cloud'
      - `duration_minutes` (integer) - Session duration

  2. Sample Data
    - Add popular games with local and cloud options
    - Include system requirements and executable paths

  3. Functions
    - Add trigger to update `updated_at` timestamp
*/

-- Add new columns to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'game_type'
  ) THEN
    ALTER TABLE games ADD COLUMN game_type text DEFAULT 'both' CHECK (game_type IN ('local', 'cloud', 'both'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'executable_path'
  ) THEN
    ALTER TABLE games ADD COLUMN executable_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'min_specs'
  ) THEN
    ALTER TABLE games ADD COLUMN min_specs jsonb DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'recommended_specs'
  ) THEN
    ALTER TABLE games ADD COLUMN recommended_specs jsonb DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE games ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add new columns to game_sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'equipment_rental_id'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN equipment_rental_id uuid REFERENCES equipment_rentals_v2(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN session_type text DEFAULT 'local' CHECK (session_type IN ('local', 'cloud'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN duration_minutes integer DEFAULT 0;
  END IF;
END $$;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for games table (drop if exists first)
DROP TRIGGER IF EXISTS games_updated_at ON games;
CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_games_updated_at();

-- Insert sample games (with ON CONFLICT to avoid duplicates)
INSERT INTO games (title, description, image_url, genre, game_type, price_per_hour, executable_path, min_specs, recommended_specs) VALUES
  (
    'Cyberpunk 2077',
    'An open-world, action-adventure RPG set in the megalopolis of Night City',
    'https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg',
    'RPG',
    'both',
    5.99,
    'C:\Program Files\Cyberpunk 2077\bin\x64\Cyberpunk2077.exe',
    '{"cpu": "Intel Core i5-3570K", "gpu": "GTX 780", "ram": "8GB", "storage": "70GB"}',
    '{"cpu": "Intel Core i7-4790", "gpu": "GTX 1060", "ram": "12GB", "storage": "70GB SSD"}'
  ),
  (
    'Fortnite',
    'Battle Royale game where 100 players fight to be the last one standing',
    'https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg',
    'Battle Royale',
    'both',
    2.99,
    'C:\Program Files\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteLauncher.exe',
    '{"cpu": "Intel Core i3", "gpu": "Intel HD 4000", "ram": "4GB", "storage": "30GB"}',
    '{"cpu": "Intel Core i5", "gpu": "GTX 660", "ram": "8GB", "storage": "30GB"}'
  ),
  (
    'Minecraft',
    'Build, explore, and survive in a blocky, procedurally-generated 3D world',
    'https://images.pexels.com/photos/9072215/pexels-photo-9072215.jpeg',
    'Sandbox',
    'both',
    1.99,
    'C:\Program Files\Minecraft\MinecraftLauncher.exe',
    '{"cpu": "Intel Core i3", "gpu": "Intel HD 4000", "ram": "4GB", "storage": "4GB"}',
    '{"cpu": "Intel Core i5", "gpu": "GTX 700", "ram": "8GB", "storage": "4GB"}'
  ),
  (
    'League of Legends',
    'Team-based strategy game where two teams of five champions battle head-to-head',
    'https://images.pexels.com/photos/6498951/pexels-photo-6498951.jpeg',
    'MOBA',
    'both',
    1.99,
    'C:\Riot Games\League of Legends\LeagueClient.exe',
    '{"cpu": "2 GHz", "gpu": "Shader 2.0", "ram": "2GB", "storage": "12GB"}',
    '{"cpu": "3 GHz", "gpu": "GTX 560", "ram": "4GB", "storage": "16GB"}'
  ),
  (
    'Valorant',
    'Tactical first-person shooter with unique character abilities',
    'https://images.pexels.com/photos/7915288/pexels-photo-7915288.jpeg',
    'FPS',
    'both',
    3.99,
    'C:\Riot Games\VALORANT\live\VALORANT.exe',
    '{"cpu": "Intel Core 2 Duo E8400", "gpu": "Intel HD 4000", "ram": "4GB", "storage": "30GB"}',
    '{"cpu": "Intel Core i3-4150", "gpu": "GTX 1050 Ti", "ram": "4GB", "storage": "30GB"}'
  ),
  (
    'Counter-Strike 2',
    'Competitive tactical FPS game with strategic team-based gameplay',
    'https://images.pexels.com/photos/7862621/pexels-photo-7862621.jpeg',
    'FPS',
    'both',
    3.49,
    'C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\cs2.exe',
    '{"cpu": "Intel Core i5-750", "gpu": "GTX 1060", "ram": "8GB", "storage": "85GB"}',
    '{"cpu": "Intel Core i7-9700K", "gpu": "RTX 2070", "ram": "16GB", "storage": "85GB SSD"}'
  ),
  (
    'Grand Theft Auto V',
    'Action-adventure game set in the open world of Los Santos',
    'https://images.pexels.com/photos/7915262/pexels-photo-7915262.jpeg',
    'Action',
    'both',
    4.99,
    'C:\Program Files\Rockstar Games\Grand Theft Auto V\GTA5.exe',
    '{"cpu": "Intel Core i5 3470", "gpu": "GTX 660", "ram": "8GB", "storage": "72GB"}',
    '{"cpu": "Intel Core i7 3770", "gpu": "GTX 1660", "ram": "16GB", "storage": "72GB"}'
  ),
  (
    'Rocket League',
    'Vehicular soccer game combining driving and sports',
    'https://images.pexels.com/photos/9072319/pexels-photo-9072319.jpeg',
    'Sports',
    'both',
    2.49,
    'C:\Program Files\Epic Games\rocketleague\Binaries\Win64\RocketLeague.exe',
    '{"cpu": "2.5 GHz Dual Core", "gpu": "GTX 760", "ram": "4GB", "storage": "20GB"}',
    '{"cpu": "3.0 GHz Quad Core", "gpu": "GTX 1060", "ram": "8GB", "storage": "20GB"}'
  )
ON CONFLICT DO NOTHING;
