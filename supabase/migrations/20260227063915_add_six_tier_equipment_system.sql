/*
  # Update Equipment Tier System to Support 6 Tiers

  ## Changes Made
  
  1. **Modified Tables**
    - `equipment_listings` - Update tier constraint to support 6 tiers
    - Add new tiers: 'enthusiast' and 'extreme'
  
  2. **New Tier Structure**
    - Tier 1: basic (Entry-Level) - 1 DL365/hr
    - Tier 2: advanced (Mid-Range) - 2 DL365/hr
    - Tier 3: professional (Performance) - 3 DL365/hr
    - Tier 4: elite (High-End) - 4 DL365/hr
    - Tier 5: enthusiast (Enthusiast) - 5 DL365/hr
    - Tier 6: extreme (Extreme) - 6 DL365/hr
  
  3. **Important Notes**
    - Existing data will remain unchanged
    - New equipment can now be classified into any of the 6 tiers
    - Automatic hardware detection will classify equipment based on specs
*/

-- Drop the old constraint on equipment tier
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'equipment_listings_tier_check'
  ) THEN
    ALTER TABLE equipment_listings DROP CONSTRAINT equipment_listings_tier_check;
  END IF;
END $$;

-- Add new constraint with 6 tiers
ALTER TABLE equipment_listings
ADD CONSTRAINT equipment_listings_tier_check 
CHECK (tier IN ('basic', 'advanced', 'professional', 'elite', 'enthusiast', 'extreme'));