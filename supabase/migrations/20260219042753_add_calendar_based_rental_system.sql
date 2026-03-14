/*
  # Calendar-Based Hourly Equipment Rental System

  1. New Tables
    - `equipment_availability_schedule`
      - Defines when equipment is available for rent (daily recurring schedule)
      - Owner sets: day of week, start time, end time
      - Example: Monday 9am-6pm, Tuesday 9am-6pm, etc.
    
    - `equipment_hourly_bookings`
      - Individual hour-slot reservations
      - Booking date, start hour, end hour
      - Both renter and owner must confirm
      - No refunds policy for missed time slots
  
  2. Changes to Existing Tables
    - Drop old `equipment_rentals` table (replaced by hourly bookings)
  
  3. Security
    - Enable RLS on both new tables
    - Owners can manage their equipment availability
    - Renters can book available slots
    - Both parties can view their bookings

  4. Important Notes
    - Time slots are booked by the hour (e.g., 2pm-3pm, 3pm-4pm)
    - Multiple renters can book different hour slots for same equipment
    - Bookings require confirmation from both parties
    - No refunds for missed time slots
*/

-- Drop old rental table
DROP TABLE IF EXISTS equipment_rentals CASCADE;

-- Equipment availability schedule (recurring weekly schedule)
CREATE TABLE IF NOT EXISTS equipment_availability_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_hour integer NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  end_hour integer NOT NULL CHECK (end_hour > start_hour AND end_hour <= 24),
  created_at timestamptz DEFAULT now(),
  UNIQUE(equipment_id, day_of_week, start_hour)
);

-- Hourly equipment bookings
CREATE TABLE IF NOT EXISTS equipment_hourly_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  start_hour integer NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  end_hour integer NOT NULL CHECK (end_hour > start_hour AND end_hour <= 24),
  coins_per_hour numeric NOT NULL,
  total_coins numeric NOT NULL,
  owner_confirmed boolean DEFAULT false,
  renter_confirmed boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(equipment_id, booking_date, start_hour)
);

-- Enable RLS
ALTER TABLE equipment_availability_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_hourly_bookings ENABLE ROW LEVEL SECURITY;

-- Policies for equipment_availability_schedule
CREATE POLICY "Anyone can view availability schedules"
  ON equipment_availability_schedule FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can insert their equipment availability"
  ON equipment_availability_schedule FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their equipment availability"
  ON equipment_availability_schedule FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their equipment availability"
  ON equipment_availability_schedule FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Policies for equipment_hourly_bookings
CREATE POLICY "Users can view their own bookings"
  ON equipment_hourly_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Renters can create bookings"
  ON equipment_hourly_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Owners and renters can update their bookings"
  ON equipment_hourly_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Users can cancel their own bookings"
  ON equipment_hourly_bookings FOR DELETE
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_availability_equipment ON equipment_availability_schedule(equipment_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON equipment_availability_schedule(day_of_week);
CREATE INDEX IF NOT EXISTS idx_bookings_equipment ON equipment_hourly_bookings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON equipment_hourly_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_renter ON equipment_hourly_bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner ON equipment_hourly_bookings(owner_id);
