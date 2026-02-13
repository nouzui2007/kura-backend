-- 早出残業基準時刻（時）をシステム設定に追加
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS "earlyOvertimeStandardHour" INTEGER NOT NULL DEFAULT 7;

COMMENT ON COLUMN public.system_settings."earlyOvertimeStandardHour" IS '早出残業基準時刻（時）';
