-- Add unique index to prevent duplicate discount codes per server (case-insensitive)
-- Ensures (server_id, lower(code)) is unique

CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_discounts_server_code ON store_discounts (server_id, lower(code));
