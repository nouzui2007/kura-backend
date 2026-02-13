-- 残業基準時刻（時）をシステム設定に追加
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS "overtimeStandardHour" INTEGER NOT NULL DEFAULT 17;

COMMENT ON COLUMN public.system_settings."overtimeStandardHour" IS '残業基準時刻（時）';
