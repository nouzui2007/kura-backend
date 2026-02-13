-- attendance に早上を追加
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS "earlyLeave" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.attendance."earlyLeave" IS '早上の有無';
