/*
  # Add Elite Tier Equipment Rental System

  ## Overview
  This migration adds a 4th premium tier called "elite" for equipment rentals at 4 DL365 coins per hour,
  featuring the absolute best, most powerful hardware available.

  ## Changes Made
  
  ### 1. Schema Updates
  - Modify `equipment_listings` tier constraint to include 'elite' tier
  - Add 'elite' as valid tier option alongside basic, advanced, professional

  ### 2. Equipment Tier Specifications

  **Tier 1 - Basic (1 DL365/hour):**
  - Gaming: GTX 1660 Super, Ryzen 5 5600X, 16GB RAM, 60-90 FPS @ 1080p
  - Mining: RTX 3060, 35 MH/s hashrate, 120W power
  - Computing: Intel i5-12400, 16GB DDR4, 6 cores/12 threads

  **Tier 2 - Advanced (2 DL365/hour):**
  - Gaming: RTX 4070, Intel i7-13700K, 32GB DDR5, 100-144 FPS @ 1440p
  - Mining: RTX 3080, 95 MH/s hashrate, 220W power
  - Computing: Intel i9-13900K, 64GB DDR5, 24 cores/32 threads

  **Tier 3 - Professional (3 DL365/hour):**
  - Gaming: RTX 4090, Intel i9-14900KS, 64GB DDR5, 144+ FPS @ 4K
  - Mining: RTX 4090, 130 MH/s hashrate, 350W power
  - Computing: Dual Xeon Platinum 8380, 256GB DDR4, 80 cores/160 threads

  **NEW Tier 4 - Elite (4 DL365/hour):**
  - Gaming: Dual RTX 4090, AMD Threadripper PRO 7995WX, 256GB DDR5, 240+ FPS @ 4K with Ray Tracing
  - Mining: 8x RTX 4090 Mining Farm, 1040 MH/s combined hashrate, 2800W power
  - Computing: Quad AMD EPYC 9654, 2TB DDR5 ECC, 384 cores/768 threads with AI accelerators

  ### 3. Sample Equipment Listings
  Adds 3 elite-tier equipment listings (gaming, mining, computing) with premium specs.

  ## Security
  - No RLS policy changes needed
  - Existing policies cover the new tier
*/

-- Modify equipment_listings tier constraint to include 'elite'
ALTER TABLE equipment_listings 
DROP CONSTRAINT IF EXISTS equipment_listings_tier_check;

ALTER TABLE equipment_listings
ADD CONSTRAINT equipment_listings_tier_check 
CHECK (tier IN ('basic', 'advanced', 'professional', 'elite'));

-- Insert elite-tier gaming equipment
INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'gaming',
  'elite',
  'Elite Gaming Workstation - Dual RTX 4090',
  'Absolute beast with dual RTX 4090s in NVLink. Crushes any game at 4K max settings with ray tracing. Professional streaming and content creation powerhouse.',
  '{"gpu": "Dual NVIDIA RTX 4090 24GB (NVLink)", "cpu": "AMD Threadripper PRO 7995WX (96 cores)", "ram": "256GB DDR5-5600", "storage": "4TB Gen5 NVMe + 16TB RAID", "fps": "240+ FPS @ 4K Ultra + Ray Tracing", "features": "10GbE networking, liquid cooling, RGB sync"}',
  4,
  'https://images.pexels.com/photos/2225617/pexels-photo-2225617.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');

-- Insert elite-tier mining equipment
INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'mining',
  'elite',
  'Elite Mining Farm - 8x RTX 4090 Rig',
  'Industrial-scale mining farm with 8 RTX 4090 GPUs. Maximum hashrate with optimized cooling and power delivery. Professional mining operation ready.',
  '{"gpu": "8x NVIDIA RTX 4090 24GB", "hashrate": "1040 MH/s (combined)", "power": "2800W (optimized)", "efficiency": "0.37 MH/W", "memory": "192GB GDDR6X total", "cooling": "Custom liquid cooling loop", "uptime": "99.9% guaranteed"}',
  4,
  'https://images.pexels.com/photos/6771607/pexels-photo-6771607.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');

-- Insert elite-tier computing equipment
INSERT INTO equipment_listings (owner_id, equipment_type, tier, name, description, specs, coins_per_hour, image_url)
SELECT 
  (SELECT id FROM user_profiles WHERE user_role = 'Miner' LIMIT 1),
  'computing',
  'elite',
  'Elite AI/HPC Server - Quad EPYC',
  'Enterprise datacenter-grade server with quad AMD EPYC processors. Designed for AI training, scientific computing, and massive parallel workloads. Includes NVIDIA A100 GPUs for AI acceleration.',
  '{"cpu": "Quad AMD EPYC 9654 (96 cores each)", "total_cores": "384 cores / 768 threads", "ram": "2TB DDR5-4800 ECC", "storage": "100TB NVMe all-flash array", "gpu": "4x NVIDIA A100 80GB", "networking": "Dual 100GbE", "features": "IPMI remote management, redundant power"}',
  4,
  'https://images.pexels.com/photos/325229/pexels-photo-325229.jpeg'
WHERE EXISTS (SELECT 1 FROM user_profiles WHERE user_role = 'Miner');