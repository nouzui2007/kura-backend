-- Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  gender TEXT,
  address TEXT,
  "postalCode" TEXT,
  "lastName" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastNameKana" TEXT,
  "firstNameKana" TEXT,
  "employeeId" TEXT NOT NULL UNIQUE,
  "hireDate" DATE,
  "birthDate" DATE,
  "workType" TEXT,
  "workLocation" TEXT,
  department TEXT,
  "branchName" TEXT,
  "employmentType" TEXT,
  "hourlyRate" INTEGER,
  "bankName" TEXT,
  "accountType" TEXT,
  "accountNumber" TEXT,
  allowances JSONB DEFAULT '[]'::jsonb,
  deductions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on employee_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON public.staff("employeeId");

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email);

-- Enable Row Level Security
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can customize this based on your auth requirements)
-- For now, allowing all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON public.staff
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policy to allow public access (you may want to restrict this in production)
-- This allows the REST API to work without authentication
CREATE POLICY "Allow public access" ON public.staff
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table and columns
COMMENT ON TABLE public.staff IS 'スタッフ情報を管理するテーブル';
COMMENT ON COLUMN public.staff.id IS 'スタッフID';
COMMENT ON COLUMN public.staff.name IS '氏名';
COMMENT ON COLUMN public.staff.email IS 'メールアドレス';
COMMENT ON COLUMN public.staff.phone IS '電話番号';
COMMENT ON COLUMN public.staff.gender IS '性別';
COMMENT ON COLUMN public.staff.address IS '住所';
COMMENT ON COLUMN public.staff."postalCode" IS '郵便番号';
COMMENT ON COLUMN public.staff."lastName" IS '姓';
COMMENT ON COLUMN public.staff."firstName" IS '名';
COMMENT ON COLUMN public.staff."lastNameKana" IS '姓（カナ）';
COMMENT ON COLUMN public.staff."firstNameKana" IS '名（カナ）';
COMMENT ON COLUMN public.staff."employeeId" IS '従業員ID';
COMMENT ON COLUMN public.staff."hireDate" IS '入社日';
COMMENT ON COLUMN public.staff."birthDate" IS '生年月日';
COMMENT ON COLUMN public.staff."workType" IS '勤務形態';
COMMENT ON COLUMN public.staff."workLocation" IS '勤務場所';
COMMENT ON COLUMN public.staff.department IS '部署';
COMMENT ON COLUMN public.staff."branchName" IS '支店名';
COMMENT ON COLUMN public.staff."employmentType" IS '雇用形態';
COMMENT ON COLUMN public.staff."hourlyRate" IS '時給';
COMMENT ON COLUMN public.staff."bankName" IS '銀行名';
COMMENT ON COLUMN public.staff."accountType" IS '口座種別';
COMMENT ON COLUMN public.staff."accountNumber" IS '口座番号';
COMMENT ON COLUMN public.staff.allowances IS '手当（JSON配列）';
COMMENT ON COLUMN public.staff.deductions IS '控除（JSON配列）';

