-- Create payroll table
CREATE TABLE IF NOT EXISTS public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  -- 給与計算結果（JSONBで柔軟に保存）
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT fk_staff FOREIGN KEY ("staffId") REFERENCES public.staff(id) ON DELETE CASCADE
);

-- Create index on month for faster lookups
CREATE INDEX IF NOT EXISTS idx_payroll_month ON public.payroll(month);

-- Create index on staffId for faster lookups
CREATE INDEX IF NOT EXISTS idx_payroll_staff_id ON public.payroll("staffId");

-- Create unique constraint on month and staffId to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_month_staff_unique ON public.payroll(month, "staffId");

-- Enable Row Level Security
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can customize this based on your auth requirements)
-- For now, allowing all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON public.payroll
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policy to allow public access (you may want to restrict this in production)
-- This allows the REST API to work without authentication
CREATE POLICY "Allow public access" ON public.payroll
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payroll_updated_at
  BEFORE UPDATE ON public.payroll
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table and columns
COMMENT ON TABLE public.payroll IS '給与計算結果を管理するテーブル';
COMMENT ON COLUMN public.payroll.id IS '給与計算ID';
COMMENT ON COLUMN public.payroll.month IS '対象月（YYYY-MM形式）';
COMMENT ON COLUMN public.payroll."staffId" IS 'スタッフID（staffテーブルへの外部キー）';
COMMENT ON COLUMN public.payroll.data IS '給与計算結果データ（JSON形式）';

