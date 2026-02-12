-- Add is_special column to store_discounts
ALTER TABLE public.store_discounts ADD COLUMN IF NOT EXISTS is_special boolean NOT NULL DEFAULT false;