-- Add retireDate and monthlySalary columns to staff table
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS "retireDate" DATE,
  ADD COLUMN IF NOT EXISTS "monthlySalary" INTEGER;

-- Add comments to new columns
COMMENT ON COLUMN public.staff."retireDate" IS '退職日';
COMMENT ON COLUMN public.staff."monthlySalary" IS '月給';

