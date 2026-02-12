-- Add per_user_limit to store_discounts and allow multiple discount_usages per user
BEGIN;

ALTER TABLE public.store_discounts
  ADD COLUMN IF NOT EXISTS per_user_limit integer NOT NULL DEFAULT 1;

-- Drop unique constraint that enforced single usage per user so per_user_limit > 1 is possible
ALTER TABLE public.discount_usages
  DROP CONSTRAINT IF EXISTS discount_usages_discount_id_user_id_key;

-- Add non-unique index to speed up queries
CREATE INDEX IF NOT EXISTS idx_discount_usages_discount_user ON public.discount_usages(discount_id, user_id);

COMMIT;
