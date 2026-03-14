/*
  # Add DL365 Wallet Balance

  1. Changes
    - Add `dl365_balance` column to `user_profiles` table
      - `dl365_balance` (numeric, default 0) - Stores user's DL365 token balance

  2. Notes
    - This field tracks the user's DL365 token holdings within the platform
    - Default value is 0 for new users
    - Uses numeric type for precise decimal handling
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'dl365_balance'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN dl365_balance numeric DEFAULT 0;
  END IF;
END $$;
