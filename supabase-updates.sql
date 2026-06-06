-- ============================================================
-- TaskEarn — Feature Updates
-- Run this in Supabase SQL Editor AFTER the original schema
-- ============================================================

-- 1. Referral system
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text unique;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid references public.profiles(id);

-- Auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET referral_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  WHERE id = new.id AND referral_code IS NULL;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.generate_referral_code();

-- Update existing profiles with referral codes
UPDATE public.profiles
SET referral_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- 2. Daily check-in tracking
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now(),
  date date DEFAULT (now() AT TIME ZONE 'Africa/Nairobi')::date,
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own checkins"
  ON public.daily_checkins FOR ALL USING (auth.uid() = user_id);

-- 3. Add expiry to surveys (midnight EAT)
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- RLS for daily_checkins for admins
CREATE POLICY "Admins view all checkins"
  ON public.daily_checkins FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
