-- Make endTime nullable in attendance table
ALTER TABLE public.attendance
  ALTER COLUMN "endTime" DROP NOT NULL;

-- Update comment
COMMENT ON COLUMN public.attendance."endTime" IS '終了時刻（任意）';
