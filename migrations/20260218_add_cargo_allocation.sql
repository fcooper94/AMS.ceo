-- Add cargo type allocation columns to user_aircraft
ALTER TABLE user_aircraft
ADD COLUMN IF NOT EXISTS cargo_light_kg INTEGER,
ADD COLUMN IF NOT EXISTS cargo_standard_kg INTEGER,
ADD COLUMN IF NOT EXISTS cargo_heavy_kg INTEGER;
