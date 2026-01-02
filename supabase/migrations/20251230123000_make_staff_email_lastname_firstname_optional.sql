-- Make email, lastName, and firstName optional in staff table
ALTER TABLE public.staff
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN "lastName" DROP NOT NULL,
  ALTER COLUMN "firstName" DROP NOT NULL;

