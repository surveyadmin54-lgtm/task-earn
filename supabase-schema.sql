-- ============================================================
-- TaskEarn Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Profiles (extends Supabase auth.users)
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text not null,
  full_name     text not null default '',
  role          text not null default 'user' check (role in ('user','admin')),
  status        text not null default 'active' check (status in ('active','suspended')),
  points        integer not null default 0,
  phone         text,
  payment_info  text,
  created_at    timestamptz default now()
);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Surveys
create table public.surveys (
  id             uuid default gen_random_uuid() primary key,
  title          text not null,
  description    text not null default '',
  points_reward  integer not null default 10,
  is_active      boolean not null default true,
  created_at     timestamptz default now()
);

-- 3. Questions (belong to a survey)
create table public.questions (
  id         uuid default gen_random_uuid() primary key,
  survey_id  uuid references public.surveys(id) on delete cascade,
  text       text not null,
  options    jsonb not null default '[]',  -- ["Option A", "Option B", ...]
  "order"    integer not null default 0
);

-- 4. Survey Responses (one per user per survey)
create table public.survey_responses (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.profiles(id) on delete cascade,
  survey_id     uuid references public.surveys(id) on delete cascade,
  answers       jsonb not null default '{}',  -- { question_id: selected_option }
  completed_at  timestamptz default now(),
  unique(user_id, survey_id)
);

-- 5. Withdrawals
create table public.withdrawals (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references public.profiles(id) on delete cascade,
  amount_points    integer not null,
  payment_method   text not null,
  payment_details  text not null,
  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note       text,
  created_at       timestamptz default now()
);

-- 6. Point Transactions (audit log)
create table public.point_transactions (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade,
  amount       integer not null,
  type         text not null check (type in ('earn','redeem')),
  description  text not null,
  created_at   timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.surveys            enable row level security;
alter table public.questions          enable row level security;
alter table public.survey_responses   enable row level security;
alter table public.withdrawals        enable row level security;
alter table public.point_transactions enable row level security;

-- Profiles: users see/edit only their own; admins see all
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update all profiles"
  on public.profiles for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Surveys: everyone reads active; only admins write
create policy "Anyone can view active surveys"
  on public.surveys for select using (is_active = true);

create policy "Admins can manage surveys"
  on public.surveys for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Questions: same as surveys
create policy "Anyone can view questions"
  on public.questions for select using (true);

create policy "Admins can manage questions"
  on public.questions for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Survey responses: users own theirs; admins see all
create policy "Users can manage own responses"
  on public.survey_responses for all using (auth.uid() = user_id);

create policy "Admins can view all responses"
  on public.survey_responses for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Withdrawals: users see own; admins see/update all
create policy "Users can manage own withdrawals"
  on public.withdrawals for all using (auth.uid() = user_id);

create policy "Admins can manage all withdrawals"
  on public.withdrawals for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Point transactions: users see own; admins see all
create policy "Users can view own transactions"
  on public.point_transactions for select using (auth.uid() = user_id);

create policy "Admins can view all transactions"
  on public.point_transactions for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================
-- Helper: award points + log transaction atomically
-- ============================================================
create or replace function public.award_points(
  p_user_id    uuid,
  p_amount     integer,
  p_description text
) returns void as $$
begin
  update public.profiles set points = points + p_amount where id = p_user_id;
  insert into public.point_transactions (user_id, amount, type, description)
  values (p_user_id, p_amount, 'earn', p_description);
end;
$$ language plpgsql security definer;

-- ============================================================
-- Seed: create your first admin user
-- After running this schema, sign up normally on the site,
-- then run this query with your user's UUID to make them admin:
--
--   UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR-USER-UUID';
--
-- ============================================================
