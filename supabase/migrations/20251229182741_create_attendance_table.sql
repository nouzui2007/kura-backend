-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  "startTime" TIME NOT NULL,
  "endTime" TIME NOT NULL,
  "staffId" TEXT NOT NULL,
  "workHours" NUMERIC(4, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT fk_staff FOREIGN KEY ("staffId") REFERENCES public.staff(id) ON DELETE CASCADE
);

-- Create index on staff_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON public.attendance("staffId");

-- Create index on date for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);

-- Create unique constraint on date and staffId to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_date_staff_unique ON public.attendance(date, "staffId");

-- Enable Row Level Security
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can customize this based on your auth requirements)
-- For now, allowing all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON public.attendance
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policy to allow public access (you may want to restrict this in production)
-- This allows the REST API to work without authentication
CREATE POLICY "Allow public access" ON public.attendance
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table and columns
COMMENT ON TABLE public.attendance IS '出勤記録を管理するテーブル';
COMMENT ON COLUMN public.attendance.id IS '出勤記録ID';
COMMENT ON COLUMN public.attendance.date IS '日付';
COMMENT ON COLUMN public.attendance."startTime" IS '開始時刻';
COMMENT ON COLUMN public.attendance."endTime" IS '終了時刻';
COMMENT ON COLUMN public.attendance."staffId" IS 'スタッフID（staffテーブルへの外部キー）';
COMMENT ON COLUMN public.attendance."workHours" IS '勤務時間（時間単位）';

