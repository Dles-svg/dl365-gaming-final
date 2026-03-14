/*
  # Add Revenue Split to Equipment Rentals

  1. Changes
    - Add `platform_fee` column to track 20% platform commission
    - Add `miner_payout` column to track 80% miner earnings
    
  2. Notes
    - Platform takes 20% commission on all rentals
    - Miners receive 80% of the rental fee
    - Both values stored for transparency and accounting
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_rentals_v2' AND column_name = 'platform_fee'
  ) THEN
    ALTER TABLE equipment_rentals_v2 ADD COLUMN platform_fee decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_rentals_v2' AND column_name = 'miner_payout'
  ) THEN
    ALTER TABLE equipment_rentals_v2 ADD COLUMN miner_payout decimal(10,2) DEFAULT 0;
  END IF;
END $$;