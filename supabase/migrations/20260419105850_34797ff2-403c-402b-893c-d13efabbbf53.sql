-- Add 'supplier' to the app_role enum.
-- This MUST be in its own migration so the new enum value is committed
-- before any tables/policies reference it in a later migration.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supplier';