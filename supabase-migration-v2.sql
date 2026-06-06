-- ============================================================
-- TaskEarn Migration v2 — Run in Supabase SQL Editor
-- ============================================================

-- 1. Add referral and check-in columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code   text unique,
  ADD COLUMN IF NOT EXISTS referred_by     uuid references public.profiles(id),
  ADD COLUMN IF NOT EXISTS last_checkin    date;

-- 2. Add expires_at to surveys (midnight EAT = UTC+3)
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 3. Auto-generate referral code on new profile
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger AS $$
BEGIN
  NEW.referral_code := upper(substring(replace(NEW.id::text, '-', ''), 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.generate_referral_code();

-- 4. Backfill referral codes for existing profiles
UPDATE public.profiles
SET referral_code = upper(substring(replace(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- 5. Daily check-in function (5 points, once per day EAT)
CREATE OR REPLACE FUNCTION public.daily_checkin(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Africa/Nairobi')::date;
  v_last  date;
BEGIN
  SELECT last_checkin INTO v_last FROM public.profiles WHERE id = p_user_id;
  IF v_last = v_today THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already checked in today');
  END IF;
  UPDATE public.profiles SET last_checkin = v_today, points = points + 5 WHERE id = p_user_id;
  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (p_user_id, 5, 'earn', 'Daily check-in bonus');
  RETURN jsonb_build_object('success', true, 'message', 'Check-in successful! +5 points');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Referral reward function (100 points for referrer)
CREATE OR REPLACE FUNCTION public.apply_referral(
  p_new_user_id uuid,
  p_referral_code text
) RETURNS jsonb AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  SELECT id INTO v_referrer_id FROM public.profiles
  WHERE referral_code = upper(p_referral_code) AND id != p_new_user_id;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid referral code');
  END IF;

  -- Check not already referred
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_new_user_id AND referred_by IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already used a referral code');
  END IF;

  -- Link referral
  UPDATE public.profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;

  -- Award referrer 100 points
  UPDATE public.profiles SET points = points + 100 WHERE id = v_referrer_id;
  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (v_referrer_id, 100, 'earn', 'Referral bonus — friend joined TaskEarn');

  RETURN jsonb_build_object('success', true, 'message', 'Referral applied! Your friend earned 100 points');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS for new columns (profiles policy already covers it)
-- No extra policies needed — existing profile policies apply
