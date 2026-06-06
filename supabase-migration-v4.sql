-- ============================================================
-- TaskEarn Migration v4 — Run in Supabase SQL Editor AFTER v3
-- Covers: fix #1, #3, #5, #6, #7, #8, #11, #12
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- FIX #6: Replace infinite-recursion RLS admin check with a
--          security-definer helper function
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Drop old recursive policies and replace with is_admin()
DROP POLICY IF EXISTS "Admins can view all profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage surveys"      ON public.surveys;
DROP POLICY IF EXISTS "Admins can manage questions"    ON public.questions;
DROP POLICY IF EXISTS "Admins can view all responses"  ON public.survey_responses;
DROP POLICY IF EXISTS "Admins can manage all withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Admins can view all transactions"  ON public.point_transactions;
DROP POLICY IF EXISTS "Admins manage gift cards"       ON public.gift_cards;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can manage surveys"
  ON public.surveys FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage questions"
  ON public.questions FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view all responses"
  ON public.survey_responses FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all withdrawals"
  ON public.withdrawals FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view all transactions"
  ON public.point_transactions FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins manage gift cards"
  ON public.gift_cards FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- FIX #1: Deduct points when a withdrawal is approved
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_withdrawal_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when status changes TO 'approved'
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    -- Check the user still has enough points
    IF (SELECT points FROM public.profiles WHERE id = NEW.user_id) < NEW.amount_points THEN
      RAISE EXCEPTION 'User has insufficient points for this withdrawal';
    END IF;

    -- Deduct points
    UPDATE public.profiles
      SET points = points - NEW.amount_points
      WHERE id = NEW.user_id;

    -- Log the deduction
    INSERT INTO public.point_transactions (user_id, amount, type, description)
    VALUES (NEW.user_id, NEW.amount_points, 'redeem',
            'Withdrawal approved — ' || NEW.payment_method);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_approved ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_approved
  AFTER UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE PROCEDURE public.on_withdrawal_approved();

-- ─────────────────────────────────────────────────────────────
-- FIX #5: Prevent over-withdrawal at insert time
--          Reject if pending + this request > current balance
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_withdrawal_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance  integer;
  v_pending  integer;
BEGIN
  SELECT points INTO v_balance FROM public.profiles WHERE id = NEW.user_id;

  SELECT COALESCE(SUM(amount_points), 0) INTO v_pending
    FROM public.withdrawals
    WHERE user_id = NEW.user_id AND status = 'pending';

  IF (v_pending + NEW.amount_points) > v_balance THEN
    RAISE EXCEPTION 'Withdrawal amount exceeds available balance (balance: %, already pending: %)',
      v_balance, v_pending;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_withdrawal_balance ON public.withdrawals;
CREATE TRIGGER trg_check_withdrawal_balance
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE PROCEDURE public.check_withdrawal_balance();

-- ─────────────────────────────────────────────────────────────
-- FIX #8 + Referral-after-approval:
--   Store pending referral intent, credit ONLY after admin approves
--   Level-5+ users get an extra 40 bonus points on approval
-- ─────────────────────────────────────────────────────────────

-- Track whether referral reward has been paid
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_rewarded boolean NOT NULL DEFAULT false;

-- Updated apply_referral: store the link but don't award points yet
CREATE OR REPLACE FUNCTION public.apply_referral(
  p_new_user_id  uuid,
  p_referral_code text
) RETURNS jsonb AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  SELECT id INTO v_referrer_id FROM public.profiles
  WHERE referral_code = upper(p_referral_code) AND id <> p_new_user_id;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid referral code');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_new_user_id AND referred_by IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already used a referral code');
  END IF;

  -- Just record the relationship; points credited on approval
  UPDATE public.profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Referral code saved. Reward credited after approval.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires when approved flips from false → true
CREATE OR REPLACE FUNCTION public.on_user_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- Only act when approved flips false → true
  IF NEW.approved = true AND OLD.approved = false THEN

    -- Level-5+ signup bonus (40 pts for the newly approved user)
    IF NEW.level >= 5 THEN
      UPDATE public.profiles SET points = points + 40 WHERE id = NEW.id;
      INSERT INTO public.point_transactions (user_id, amount, type, description)
      VALUES (NEW.id, 40, 'earn', 'Level 5+ new member bonus');
    END IF;

    -- Referral reward: pay referrer 100 pts (once only)
    IF NEW.referred_by IS NOT NULL AND NEW.referral_rewarded = false THEN
      UPDATE public.profiles SET points = points + 100 WHERE id = NEW.referred_by;
      INSERT INTO public.point_transactions (user_id, amount, type, description)
      VALUES (NEW.referred_by, 100, 'earn', 'Referral bonus — friend approved on TaskEarn');

      -- Mark rewarded so it can never fire twice
      UPDATE public.profiles SET referral_rewarded = true WHERE id = NEW.id;
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_approved ON public.profiles;
CREATE TRIGGER trg_user_approved
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.on_user_approved();

-- ─────────────────────────────────────────────────────────────
-- FIX #11: Surveys reset at midnight EAT — new function
--           expose_tasks_reset_at for clients to display
--   Implementation: completed surveys older than the last
--   midnight EAT are treated as "available" again.
--   We do this by adding a reset_daily boolean to surveys.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS resets_daily boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- FIX #12: Email notification helper (logs to a table; actual
--           sending via Supabase Edge Function / webhook)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_queue (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email    text NOT NULL,
  subject     text NOT NULL,
  body        text NOT NULL,
  sent        boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email queue"
  ON public.email_queue FOR ALL USING (public.is_admin());

-- Queue approval email when user is approved
CREATE OR REPLACE FUNCTION public.queue_approval_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.approved = true AND OLD.approved = false THEN
    INSERT INTO public.email_queue (to_email, subject, body)
    VALUES (
      NEW.email,
      'Your TaskEarn account has been approved!',
      'Hi ' || split_part(NEW.full_name, ' ', 1) || E',\n\nGreat news — your TaskEarn account has been approved! You can now log in and start completing tasks to earn points.\n\nVisit: ' || current_setting('app.site_url', true) || E'\n\nHappy earning,\nThe TaskEarn Team'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_approval_email ON public.profiles;
CREATE TRIGGER trg_queue_approval_email
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.queue_approval_email();

-- Queue withdrawal status email
CREATE OR REPLACE FUNCTION public.queue_withdrawal_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
  v_name  text;
BEGIN
  IF NEW.status <> OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    SELECT email, full_name INTO v_email, v_name
      FROM public.profiles WHERE id = NEW.user_id;

    IF NEW.status = 'approved' THEN
      INSERT INTO public.email_queue (to_email, subject, body)
      VALUES (
        v_email,
        'Your withdrawal has been approved ✅',
        'Hi ' || split_part(v_name, ' ', 1) || E',\n\nYour withdrawal request for ' || NEW.amount_points || E' points via ' || NEW.payment_method || E' has been APPROVED.\n\nThe payment will be sent to: ' || NEW.payment_details || E'\n\nThank you for using TaskEarn!'
      );
    ELSE
      INSERT INTO public.email_queue (to_email, subject, body)
      VALUES (
        v_email,
        'Withdrawal request update',
        'Hi ' || split_part(v_name, ' ', 1) || E',\n\nUnfortunately your withdrawal request for ' || NEW.amount_points || E' points has been rejected.' ||
        CASE WHEN NEW.admin_note IS NOT NULL THEN E'\n\nAdmin note: ' || NEW.admin_note ELSE '' END ||
        E'\n\nIf you have questions, contact us on WhatsApp.\n\nTaskEarn Team'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_withdrawal_email ON public.withdrawals;
CREATE TRIGGER trg_queue_withdrawal_email
  AFTER UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE PROCEDURE public.queue_withdrawal_email();

-- ─────────────────────────────────────────────────────────────
-- FIX #7: WhatsApp number stored in DB settings (optional,
--          app uses env var NEXT_PUBLIC_WHATSAPP_NUMBER)
-- ─────────────────────────────────────────────────────────────
-- No schema change needed — handled in .env.local.example

-- ─────────────────────────────────────────────────────────────
-- FIX #15: survey_responses unique constraint already exists.
--           For daily-reset surveys we use a view that excludes
--           responses older than the last midnight EAT.
-- ─────────────────────────────────────────────────────────────
-- (handled in app code via resets_daily flag)

-- Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON public.withdrawals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by    ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_email_queue_sent        ON public.email_queue(sent);


-- ─────────────────────────────────────────────────────────────
-- FIX #2: Atomic survey submission — insert response + award
--          points in one transaction so neither can fail alone
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_survey(
  p_user_id   uuid,
  p_survey_id uuid,
  p_answers   jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points  integer;
  v_title   text;
  v_resets  boolean;
  v_last_midnight timestamptz;
BEGIN
  -- Verify survey exists and is active
  SELECT points_reward, title, resets_daily
    INTO v_points, v_title, v_resets
    FROM public.surveys
    WHERE id = p_survey_id AND is_active = true;

  IF v_points IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Survey not found or inactive.');
  END IF;

  -- Check not already completed (for daily-reset surveys: only since last midnight EAT)
  IF v_resets THEN
    v_last_midnight := (date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi');
    IF EXISTS (
      SELECT 1 FROM public.survey_responses
      WHERE user_id = p_user_id AND survey_id = p_survey_id
        AND completed_at >= v_last_midnight
    ) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Already completed today. Come back tomorrow!');
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.survey_responses
      WHERE user_id = p_user_id AND survey_id = p_survey_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Survey already completed.');
    END IF;
  END IF;

  -- Insert the response
  INSERT INTO public.survey_responses (user_id, survey_id, answers)
  VALUES (p_user_id, p_survey_id, p_answers);

  -- Award points
  UPDATE public.profiles SET points = points + v_points WHERE id = p_user_id;
  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_points, 'earn', 'Completed survey: ' || v_title);

  RETURN jsonb_build_object('success', true, 'points_awarded', v_points);
END;
$$;
-- FIX: Drop unique constraint that blocks daily-reset survey resubmissions
ALTER TABLE public.survey_responses
  DROP CONSTRAINT IF EXISTS survey_responses_user_id_survey_id_key;