-- 早上手当基準時刻（時）をシステム設定に追加
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS "earlyLeaveStandardHour" INTEGER NOT NULL DEFAULT 17;

COMMENT ON COLUMN public.system_settings."earlyLeaveStandardHour" IS '早上手当基準時刻（時）';
