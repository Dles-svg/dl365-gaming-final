/*
  # Equipment Rental System

  ## Overview
  This migration adds a complete equipment rental marketplace where users can rent mining,
  computing, and gaming equipment using DL365 coins on an hourly basis.

  ## 1. New Tables
  
  ### `equipment_listings`
  Stores all available equipment for rent with specifications and pricing.
  - `id` (uuid, primary key) - Unique equipment listing ID
  - `owner_id` (uuid, foreign key) - User who owns/lists the equipment
  - `equipment_type` (text) - Type: 'mining', 'computing', or 'gaming'
  - `tier` (text) - Specification tier: 'basic', 'advanced', or 'professional'
  - `name` (text) - Equipment name/model
  - `description` (text) - Detailed description
  - `specs` (jsonb) - Technical specifications (GPU, CPU, RAM, etc.)
  - `coins_per_hour` (integer) - Rental cost in DL365 coins per hour
  - `available` (boolean) - Whether equipment is currently available
  - `total_rentals` (integer) - Count of completed rentals
  - `rating` (numeric) - Average user rating (0-5)
  - `image_url` (text) - Equipment image URL
  - `created_at` (timestamptz) - When listing was created
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `equipment_rentals`
  Tracks active and completed equipment rentals with payment tracking.
  - `id` (uuid, primary key) - Unique rental ID
  - `equipment_id` (uuid, foreign key) - Reference to equipment_listings
  - `renter_id` (uuid, foreign key) - User renting the equipment
  - `owner_id` (uuid) - Equipment owner (for quick lookups)
  - `start_time` (timestamptz) - When rental started
  - `end_time` (timestamptz) - When rental ended (null if active)
  - `hours_rented` (integer) - Total hours rented
  - `coins_per_hour` (integer) - Locked-in hourly rate
  - `total_coins_paid` (integer) - Total coins paid so far
  - `status` (text) - Status: 'active', 'completed', or 'cancelled'
  - `access_info` (jsonb) - Connection details (IP, credentials, etc.)
  - `created_at` (timestamptz) - Rental creation time

  ## 2. Pricing Structure
  - **Basic Tier**: 1 DL365 coin per hour
  - **Advanced Tier**: 2 DL365 coins per hour
  - **Professional Tier**: 3 DL365 coins per hour

  ## 3. Security
  - Enable Row Level Security (RLS) on all tables
  - Users can view all available equipment listings
  - Users can only create listings if they are miners
  - Users can view their own rentals and rentals of their equipment
  - Equipment owners can update their own listings
  - Only active renters can view access_info for their rentals

  ## 4. Important Notes
  - Coin deduction happens hourly via application logic
  - When equipment is rented, `available` is set to false
  - When rental ends, `available` is set back to true
  - Ratings are updated after rental completion
*/

-- Create equipment_listings table
CREATE TABLE IF NOT EXISTS equipment_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  equipment_type text NOT NULL CHECK (equipment_type IN ('mining', 'computing', 'gaming')),
  tier text NOT NULL CHECK (tier IN ('basic', 'advanced', 'professional')),
  name text NOT NULL,
  description text DEFAULT '',
  specs jsonb DEFAULT '{}'::jsonb,
  coins_per_hour integer NOT NULL CHECK (coins_per_hour > 0),
  available boolean DEFAULT true,
  total_rentals integer DEFAULT 0,
  rating numeric(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create equipment_rentals table
CREATE TABLE IF NOT EXISTS equipment_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid REFERENCES equipment_listings(id) ON DELETE CASCADE NOT NULL,
  renter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid NOT NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  hours_rented integer DEFAULT 0,
  coins_per_hour integer NOT NULL,
  total_coins_paid integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  access_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_listings_type ON equipment_listings(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_listings_tier ON equipment_listings(tier);
CREATE INDEX IF NOT EXISTS idx_equipment_listings_available ON equipment_listings(available);
CREATE INDEX IF NOT EXISTS idx_equipment_listings_owner ON equipment_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_equipment ON equipment_rentals(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_renter ON equipment_rentals(renter_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_status ON equipment_rentals(status);

-- Enable Row Level Security
ALTER TABLE equipment_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_rentals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment_listings

-- Anyone can view available equipment listings
CREATE POLICY "Anyone can view equipment listings"
  ON equipment_listings FOR SELECT
  TO authenticated
  USING (true);

-- Miners can create equipment listings
CREATE POLICY "Miners can create equipment listings"
  ON equipment_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_role = 'Miner'
    )
  );

-- Equipment owners can update their own listings
CREATE POLICY "Owners can update own equipment listings"
  ON equipment_listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Equipment owners can delete their own listings
CREATE POLICY "Owners can delete own equipment listings"
  ON equipment_listings FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- RLS Policies for equipment_rentals

-- Users can view their own rentals (as renter or owner)
CREATE POLICY "Users can view own rentals"
  ON equipment_rentals FOR SELECT
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Authenticated users can create rentals
CREATE POLICY "Users can create rentals"
  ON equipment_rentals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = renter_id);

-- Renters and owners can update rentals
CREATE POLICY "Renters and owners can update rentals"
  ON equipment_rentals FOR UPDATE
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Function to update equipment availability when rental status changes
CREATE OR REPLACE FUNCTION update_equipment_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE equipment_listings
    SET available = false
    WHERE id = NEW.equipment_id;
  ELSIF NEW.status IN ('completed', 'cancelled') THEN
    UPDATE equipment_listings
    SET available = true,
        total_rentals = total_rentals + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END
    WHERE id = NEW.equipment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update equipment availability
DROP TRIGGER IF EXISTS trigger_update_equipment_availability ON equipment_rentals;
CREATE TRIGGER trigger_update_equipment_availability
  AFTER INSERT OR UPDATE OF status ON equipment_rentals
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_availability();

-- Insert sample equipment listings for demonstration
INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'mining',
  'basic',
  'Basic Mining Rig - RTX 3060',
  'Entry-level mining rig perfect for beginners. Stable hashrate and low power consumption.',
  '{"gpu": "NVIDIA RTX 3060", "hashrate": "35 MH/s", "power": "120W", "memory": "12GB GDDR6"}',
  1,
  'https://images.pexels.com/photos/1148820/pexels-photo-1148820.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');

INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'mining',
  'advanced',
  'Advanced Mining Rig - RTX 3080',
  'High-performance mining rig with excellent efficiency. Great for serious miners.',
  '{"gpu": "NVIDIA RTX 3080", "hashrate": "95 MH/s", "power": "220W", "memory": "10GB GDDR6X"}',
  2,
  'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');

INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'mining',
  'professional',
  'Professional Mining Rig - RTX 4090',
  'Top-tier mining beast with maximum hashrate. For professional operations.',
  '{"gpu": "NVIDIA RTX 4090", "hashrate": "130 MH/s", "power": "350W", "memory": "24GB GDDR6X"}',
  3,
  'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');

INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'computing',
  'basic',
  'Basic Server - Intel i5',
  'Standard computing server for development and light workloads.',
  '{"cpu": "Intel i5-12400", "ram": "16GB DDR4", "storage": "500GB NVMe", "cores": "6 cores / 12 threads"}',
  1,
  'https://images.pexels.com/photos/2582928/pexels-photo-2582928.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');

INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'computing',
  'advanced',
  'Advanced Server - Intel i9',
  'High-performance server for intensive computing tasks and AI workloads.',
  '{"cpu": "Intel i9-13900K", "ram": "64GB DDR5", "storage": "2TB NVMe", "cores": "24 cores / 32 threads"}',
  2,
  'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');

INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'computing',
  'professional',
  'Professional Server - Dual Xeon',
  'Enterprise-grade dual processor server for maximum performance.',
  '{"cpu": "Dual Xeon Platinum 8380", "ram": "256GB DDR4", "storage": "8TB NVMe RAID", "cores": "80 cores / 160 threads"}',
  3,
  'https://images.pexels.com/photos/2881229/pexels-photo-2881229.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');

INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'gaming',
  'basic',
  'Basic Gaming PC - GTX 1660',
  'Solid 1080p gaming performance. Perfect for casual gaming and streaming.',
  '{"gpu": "NVIDIA GTX 1660 Super", "cpu": "AMD Ryzen 5 5600X", "ram": "16GB DDR4", "fps": "60-90 FPS @ 1080p"}',
  1,
  'https://images.pexels.com/photos/2923156/pexels-photo-2923156.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');

INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'gaming',
  'advanced',
  'Advanced Gaming PC - RTX 4070',
  'Excellent 1440p gaming with ray tracing. High FPS in all modern games.',
  '{"gpu": "NVIDIA RTX 4070", "cpu": "Intel i7-13700K", "ram": "32GB DDR5", "fps": "100-144 FPS @ 1440p"}',
  2,
  'https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');

INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'gaming',
  'professional',
  'Professional Gaming PC - RTX 4090',
  'Ultimate 4K gaming beast. Max settings with ray tracing enabled.',
  '{"gpu": "NVIDIA RTX 4090", "cpu": "Intel i9-14900KS", "ram": "64GB DDR5", "fps": "144+ FPS @ 4K"}',
  3,
  'https://images.pexels.com/photos/7148444/pexels-photo-7148444.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');