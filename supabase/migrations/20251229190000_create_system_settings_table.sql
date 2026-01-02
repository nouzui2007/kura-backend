-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 労働時間設定
  "regularHoursPerDay" NUMERIC(4, 2) NOT NULL DEFAULT 8,
  "defaultBreakMinutes" INTEGER NOT NULL DEFAULT 60,
  "breakMinutesFor6Hours" INTEGER NOT NULL DEFAULT 45,
  "breakMinutesFor8Hours" INTEGER NOT NULL DEFAULT 60,
  -- 残業設定
  "overtimeThreshold" NUMERIC(4, 2) NOT NULL DEFAULT 45,
  "overtimeRate" NUMERIC(5, 2) NOT NULL DEFAULT 25,
  "excessOvertimeRate" NUMERIC(5, 2) NOT NULL DEFAULT 50,
  "lateNightRate" NUMERIC(5, 2) NOT NULL DEFAULT 25,
  "holidayRate" NUMERIC(5, 2) NOT NULL DEFAULT 35,
  "lateNightStartHour" INTEGER NOT NULL DEFAULT 22,
  "lateNightEndHour" INTEGER NOT NULL DEFAULT 5,
  -- 給与設定
  "defaultHourlyRate" INTEGER NOT NULL DEFAULT 1200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- システム設定は1レコードのみとする制約
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_single ON public.system_settings((1));

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can customize this based on your auth requirements)
-- For now, allowing all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON public.system_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policy to allow public access (you may want to restrict this in production)
-- This allows the REST API to work without authentication
CREATE POLICY "Allow public access" ON public.system_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table and columns
COMMENT ON TABLE public.system_settings IS 'システム設定を管理するテーブル';
COMMENT ON COLUMN public.system_settings.id IS '設定ID';
COMMENT ON COLUMN public.system_settings."regularHoursPerDay" IS '法定労働時間（時間/日）';
COMMENT ON COLUMN public.system_settings."defaultBreakMinutes" IS 'デフォルト休憩時間（分）';
COMMENT ON COLUMN public.system_settings."breakMinutesFor6Hours" IS '6時間超の法定休憩時間（分）';
COMMENT ON COLUMN public.system_settings."breakMinutesFor8Hours" IS '8時間超の法定休憩時間（分）';
COMMENT ON COLUMN public.system_settings."overtimeThreshold" IS '月の残業時間閾値（時間）';
COMMENT ON COLUMN public.system_settings."overtimeRate" IS '残業割増率（%）';
COMMENT ON COLUMN public.system_settings."excessOvertimeRate" IS '超過残業割増率（%）';
COMMENT ON COLUMN public.system_settings."lateNightRate" IS '深夜割増率（%）';
COMMENT ON COLUMN public.system_settings."holidayRate" IS '休日割増率（%）';
COMMENT ON COLUMN public.system_settings."lateNightStartHour" IS '深夜時間帯開始（時）';
COMMENT ON COLUMN public.system_settings."lateNightEndHour" IS '深夜時間帯終了（時）';
COMMENT ON COLUMN public.system_settings."defaultHourlyRate" IS 'デフォルト時給（円）';

-- デフォルト設定を1件挿入
INSERT INTO public.system_settings (
  "regularHoursPerDay",
  "defaultBreakMinutes",
  "breakMinutesFor6Hours",
  "breakMinutesFor8Hours",
  "overtimeThreshold",
  "overtimeRate",
  "excessOvertimeRate",
  "lateNightRate",
  "holidayRate",
  "lateNightStartHour",
  "lateNightEndHour",
  "defaultHourlyRate"
) VALUES (
  8,
  60,
  45,
  60,
  45,
  25,
  50,
  25,
  35,
  22,
  5,
  1200
) ON CONFLICT DO NOTHING;

