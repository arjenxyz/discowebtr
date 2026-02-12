-- Add min_spend column to store_discounts
ALTER TABLE store_discounts
  ADD COLUMN IF NOT EXISTS min_spend numeric NOT NULL DEFAULT 0;
