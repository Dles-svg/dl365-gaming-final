/*
  # Card Purchase System for DL365 Tokens

  ## Overview
  Adds a fixed-price card purchase system for DL365 tokens at $2.50 per token.
  This provides the primary distribution channel with no slippage or liquidity concerns.

  ## New Tables

  ### `card_purchases`
  Tracks all card purchase transactions
  - `id` (uuid, primary key) - Unique purchase ID
  - `user_id` (uuid) - Reference to auth.users
  - `amount_usd` (numeric) - USD amount paid
  - `token_amount` (numeric) - DL365 tokens purchased (amount_usd / 2.50)
  - `card_last4` (text) - Last 4 digits of card (for display)
  - `card_brand` (text) - Card brand (Visa, Mastercard, etc.)
  - `status` (text) - Payment status: pending, completed, failed, refunded
  - `payment_intent_id` (text) - External payment processor reference
  - `error_message` (text) - Error details if failed
  - `created_at` (timestamptz) - Purchase timestamp
  - `completed_at` (timestamptz) - When tokens were delivered

  ### `token_price_history`
  Tracks price changes over time (for analytics)
  - `id` (uuid, primary key)
  - `price_usd` (numeric) - Price per token in USD
  - `effective_from` (timestamptz) - When this price became effective
  - `set_by` (uuid) - Admin who set the price
  - `notes` (text) - Reason for price change

  ## Security
  - Enable RLS on all new tables
  - Users can only view their own purchases
  - Only authenticated users can make purchases
  - Price history is read-only for all users

  ## Important Notes
  1. Fixed price of $2.50 per DL365 token
  2. Instant token delivery upon successful payment
  3. Purchase history for user tracking
  4. Integration with existing wallet system
*/

-- Create card_purchases table
CREATE TABLE IF NOT EXISTS card_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  token_amount numeric NOT NULL CHECK (token_amount > 0),
  card_last4 text,
  card_brand text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_intent_id text,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

-- Create token_price_history table
CREATE TABLE IF NOT EXISTS token_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_usd numeric NOT NULL CHECK (price_usd > 0),
  effective_from timestamptz DEFAULT now() NOT NULL,
  set_by uuid REFERENCES auth.users(id),
  notes text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_card_purchases_user_id ON card_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_card_purchases_status ON card_purchases(status);
CREATE INDEX IF NOT EXISTS idx_card_purchases_created_at ON card_purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_price_history_effective_from ON token_price_history(effective_from DESC);

-- Enable RLS
ALTER TABLE card_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for card_purchases

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON card_purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own purchases
CREATE POLICY "Users can create own purchases"
  ON card_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- System can update purchase status (for payment processing)
CREATE POLICY "Users can update own purchases"
  ON card_purchases
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for token_price_history

-- Everyone can view price history
CREATE POLICY "Anyone can view price history"
  ON token_price_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial price of $2.50
INSERT INTO token_price_history (price_usd, notes)
VALUES (2.50, 'Initial launch price - Fixed card purchase rate')
ON CONFLICT DO NOTHING;

-- Create a function to process completed purchases
CREATE OR REPLACE FUNCTION process_card_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- When a purchase is marked as completed, credit the user's wallet
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update wallet balance
    INSERT INTO wallets (user_id, dl365_balance, total_earned)
    VALUES (NEW.user_id, NEW.token_amount, NEW.token_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      dl365_balance = wallets.dl365_balance + NEW.token_amount,
      total_earned = wallets.total_earned + NEW.token_amount;
    
    -- Set completion timestamp
    NEW.completed_at = now();
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description)
    VALUES (
      NEW.user_id,
      'card_purchase',
      NEW.token_amount,
      format('Card purchase: %s DL365 for $%s', NEW.token_amount, NEW.amount_usd)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic wallet crediting
DROP TRIGGER IF EXISTS card_purchase_completed ON card_purchases;
CREATE TRIGGER card_purchase_completed
  BEFORE UPDATE ON card_purchases
  FOR EACH ROW
  EXECUTE FUNCTION process_card_purchase();