-- Add fleet cost configuration columns to organization_settings
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS fuel_price_per_liter NUMERIC NOT NULL DEFAULT 1.45,
ADD COLUMN IF NOT EXISTS avg_insurance_per_vehicle_annual NUMERIC NOT NULL DEFAULT 1200,
ADD COLUMN IF NOT EXISTS avg_maintenance_per_vehicle_annual NUMERIC NOT NULL DEFAULT 800,
ADD COLUMN IF NOT EXISTS depreciation_rate_percent NUMERIC NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS avg_vehicle_value NUMERIC NOT NULL DEFAULT 25000,
ADD COLUMN IF NOT EXISTS fuel_unit TEXT NOT NULL DEFAULT 'liters',
ADD COLUMN IF NOT EXISTS co2_per_liter_diesel NUMERIC NOT NULL DEFAULT 2.68,
ADD COLUMN IF NOT EXISTS co2_per_liter_petrol NUMERIC NOT NULL DEFAULT 2.31;