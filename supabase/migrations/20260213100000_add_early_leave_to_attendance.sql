-- attendance に早上がりを追加
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS "earlyLeave" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.attendance."earlyLeave" IS '早上がりの有無';
