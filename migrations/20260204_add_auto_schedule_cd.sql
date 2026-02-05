-- Add auto-schedule columns for C and D checks
ALTER TABLE user_aircraft
ADD COLUMN IF NOT EXISTS auto_schedule_c BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_schedule_d BOOLEAN DEFAULT FALSE;
