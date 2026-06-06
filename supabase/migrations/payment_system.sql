ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_level integer DEFAULT 1;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_amount integer DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mpesa_code text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS assigned_till text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

UPDATE public.profiles
SET
  payment_level = 1,
  payment_amount = 0,
  payment_status = 'approved'
WHERE payment_level IS NULL;