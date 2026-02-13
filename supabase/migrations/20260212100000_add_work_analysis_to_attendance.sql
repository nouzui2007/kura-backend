-- attendance に早出残業・残業・深夜残業時間を追加
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS "earlyOvertime" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "overtime" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lateNightOvertimeHours" NUMERIC(4, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.attendance."earlyOvertime" IS '早出残業の有無';
COMMENT ON COLUMN public.attendance."overtime" IS '残業の有無';
COMMENT ON COLUMN public.attendance."lateNightOvertimeHours" IS '深夜残業時間（時間）';
