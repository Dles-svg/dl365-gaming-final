/*
  # Add Balance Management Functions

  1. New Functions
    - `deduct_balance` - Safely deduct DL365 tokens from user balance
    - `add_balance` - Safely add DL365 tokens to user balance
    
  2. Security
    - Functions use security definer for atomic updates
    - Prevent negative balances
    - Return success/failure status
*/

CREATE OR REPLACE FUNCTION deduct_balance(user_id uuid, amount decimal)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance decimal;
BEGIN
  SELECT dl365_balance INTO current_balance
  FROM profiles
  WHERE id = user_id
  FOR UPDATE;

  IF current_balance >= amount THEN
    UPDATE profiles
    SET dl365_balance = dl365_balance - amount
    WHERE id = user_id;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION add_balance(user_id uuid, amount decimal)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET dl365_balance = dl365_balance + amount
  WHERE id = user_id;
  RETURN true;
END;
$$;