-- ============================================================
-- TaskEarn Migration v3
-- Run in Supabase SQL Editor AFTER migration v2
-- ============================================================

-- 1. Add level and approval status to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS level       integer not null default 1 check (level between 1 and 7),
  ADD COLUMN IF NOT EXISTS approved    boolean not null default false;

-- Existing active users: auto-approve them so they're not locked out
UPDATE public.profiles SET approved = true WHERE status = 'active';

-- 2. Add targeting to surveys
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS min_level      integer default 1,         -- minimum level to see this survey
  ADD COLUMN IF NOT EXISTS target_user_ids jsonb default '[]'::jsonb; -- specific user UUIDs, empty = all levels

-- 3. Gift cards table
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id            uuid default gen_random_uuid() primary key,
  code          text not null unique,
  points_value  integer not null,
  is_redeemed   boolean not null default false,
  redeemed_by   uuid references public.profiles(id),
  redeemed_at   timestamptz,
  created_at    timestamptz default now(),
  note          text
);

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- Users can only see/redeem their own or unredeemed cards
CREATE POLICY "Users can redeem gift cards"
  ON public.gift_cards FOR ALL
  USING (
    is_redeemed = false
    OR redeemed_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins manage gift cards"
  ON public.gift_cards FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Redeem gift card function
CREATE OR REPLACE FUNCTION public.redeem_gift_card(
  p_user_id uuid,
  p_code    text
) RETURNS jsonb AS $$
DECLARE
  v_card   public.gift_cards%ROWTYPE;
  v_approved boolean;
BEGIN
  -- Check user is approved
  SELECT approved INTO v_approved FROM public.profiles WHERE id = p_user_id;
  IF NOT v_approved THEN
    RETURN jsonb_build_object('success', false, 'message', 'Your account is pending approval.');
  END IF;

  -- Find the card
  SELECT * INTO v_card FROM public.gift_cards
  WHERE upper(code) = upper(p_code) AND is_redeemed = false;

  IF v_card.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or already redeemed code.');
  END IF;

  -- Redeem it
  UPDATE public.gift_cards
  SET is_redeemed = true, redeemed_by = p_user_id, redeemed_at = now()
  WHERE id = v_card.id;

  -- Award points
  UPDATE public.profiles SET points = points + v_card.points_value WHERE id = p_user_id;
  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_card.points_value, 'earn', 'Gift card redeemed: ' || upper(p_code));

  RETURN jsonb_build_object('success', true, 'message', 'Gift card redeemed! +' || v_card.points_value || ' points added.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update award_points to check approval
-- (existing function is fine, no change needed)

-- 6. Update RLS on surveys to respect level targeting
-- (handled in app logic for flexibility)

-- 7. Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON public.profiles(approved);
CREATE INDEX IF NOT EXISTS idx_profiles_level    ON public.profiles(level);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code   ON public.gift_cards(upper(code));

-- Add max_level column (run if not already added)
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS max_level integer default 7;
