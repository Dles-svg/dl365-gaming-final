/*
  # Update Equipment Pricing to Tier-Based System

  1. Changes
    - Updates all equipment pricing to match tier system
    - **Tier 1 (Basic)**: 1 DL365/hour
    - **Tier 2 (Advanced)**: 2 DL365/hour
    - **Tier 3 (Professional)**: 3 DL365/hour
    - **Tier 4 (Elite)**: 4 DL365/hour

  2. Equipment Assignment by Tier

    **Tier 1 (1 DL365/hour) - Entry Level:**
    - GTX 1660 Super (Gaming GPU)
    - Ryzen 5 5600X (Gaming CPU)
    - RTX 3060 (Mining GPU)
    - Intel i5-12400 (Computing CPU)

    **Tier 2 (2 DL365/hour) - Advanced:**
    - RTX 4070 (Gaming GPU)
    - Intel i7-13700K (Gaming CPU)
    - RTX 3080 (Mining GPU)
    - Intel i9-13900K (Computing CPU)

    **Tier 3 (3 DL365/hour) - Professional:**
    - RTX 4090 (Gaming GPU)
    - Intel i9-14900KS (Gaming CPU)
    - Dual Xeon Platinum 8380 (Computing CPU)

    **Tier 4 (4 DL365/hour) - Elite:**
    - Dual RTX 4090 NVLink (Gaming GPU)
    - AMD Threadripper PRO 7995WX (Gaming/Computing CPU)
    - 8x RTX 4090 Mining Farm (Mining)
    - Quad AMD EPYC 9654 (Computing)

  3. Notes
    - Simple pricing: tier number = DL365 cost per hour
    - All equipment maintains tier badge classification
    - Pricing is consistent across equipment types within same tier
*/

-- Update Tier 1 (Basic) equipment - 1 DL365/hour
UPDATE equipment_listings 
SET coins_per_hour = 1 
WHERE tier = 'basic';

-- Update Tier 2 (Advanced) equipment - 2 DL365/hour
UPDATE equipment_listings 
SET coins_per_hour = 2 
WHERE tier = 'advanced';

-- Update Tier 3 (Professional) equipment - 3 DL365/hour
UPDATE equipment_listings 
SET coins_per_hour = 3 
WHERE tier = 'professional';

-- Update Tier 4 (Elite) equipment - 4 DL365/hour
UPDATE equipment_listings 
SET coins_per_hour = 4 
WHERE tier = 'elite';
