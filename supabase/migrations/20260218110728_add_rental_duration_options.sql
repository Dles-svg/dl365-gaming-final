/*
  # Add Rental Duration Options

  1. Changes
    - Add `rental_duration_hours` column to equipment_rentals table
    - Add `rental_end_time` column to equipment_rentals table
    - Add default rental duration presets
    - Update rental status tracking

  2. New Columns
    - `rental_duration_hours` (integer) - How many hours the rental is for
    - `rental_end_time` (timestamptz) - When the rental period ends
    - `auto_ended` (boolean) - Whether the rental was automatically ended when time expired

  3. Notes
    - Supports hourly, daily (24h), and multi-day rentals
    - Frontend will calculate total cost: duration_hours * coins_per_hour
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_rentals' AND column_name = 'rental_duration_hours'
  ) THEN
    ALTER TABLE equipment_rentals ADD COLUMN rental_duration_hours integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_rentals' AND column_name = 'rental_end_time'
  ) THEN
    ALTER TABLE equipment_rentals ADD COLUMN rental_end_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_rentals' AND column_name = 'auto_ended'
  ) THEN
    ALTER TABLE equipment_rentals ADD COLUMN auto_ended boolean DEFAULT false;
  END IF;
END $$;
