-- Add breakMinutes column to attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS "breakMinutes" INTEGER;

-- Update comment
COMMENT ON COLUMN public.attendance."breakMinutes" IS '休憩時間（分単位）';
