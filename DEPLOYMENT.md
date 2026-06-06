# TaskEarn — Deployment Guide

Follow these steps in order. Total time: ~30 minutes.

---

## Step 1 — Set Up Supabase (Database + Auth)

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project**, give it a name (e.g. `taskearn`), set a strong DB password, pick a region close to your users (e.g. `East Africa`).
3. Wait ~2 minutes for the project to spin up.
4. In the left sidebar go to **SQL Editor** → click **New query**.
5. Open `supabase-schema.sql` from this project, copy the entire contents, paste it into the editor, and click **Run**.
6. You should see "Success" for all statements. This creates all your tables, security rules, and helper functions.

### Get your API keys
1. In Supabase sidebar → **Settings** → **API**.
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Enable Email Auth
1. Supabase sidebar → **Authentication** → **Providers**.
2. Make sure **Email** is enabled (it is by default).
3. For production, go to **Auth** → **SMTP Settings** and add a real email provider (e.g. Resend, SendGrid) so confirmation emails actually send.

---

## Step 2 — Prepare the Code

1. Make sure you have **Node.js 18+** installed: `node --version`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the env file:
   ```bash
   cp .env.local.example .env.local
   ```
4. Open `.env.local` and fill in your values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
   ```
5. Test locally:
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) — you should see the TaskEarn landing page.

---

## Step 3 — Create Your Admin Account

1. Go to your local site at `http://localhost:3000/auth/register`.
2. Sign up with your admin email and password.
3. Check your email and confirm your account.
4. Go back to **Supabase** → **Table Editor** → `profiles`.
5. Find your row, click the `role` cell, change it from `user` to `admin`, and save.
6. Now log in at `/auth/login` — you'll be redirected to `/admin/dashboard`.

> ⚠️ Alternatively, run this SQL in Supabase SQL Editor (replace the UUID):
> ```sql
> UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
> ```

---

## Step 4 — Deploy to Vercel

1. Push your code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial TaskEarn commit"
   # Create a repo on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/taskearn.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign up (free).
3. Click **Add New Project** → Import your GitHub repo.
4. Vercel auto-detects Next.js. Before clicking Deploy, click **Environment Variables** and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL     = https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...your-anon-key...
   ```
5. Click **Deploy**. In ~2 minutes your site is live at `your-project.vercel.app`.

---

## Step 5 — Point a Custom Domain (Optional)

1. In Vercel → your project → **Settings** → **Domains**.
2. Add your domain (e.g. `taskearn.co.ke`).
3. Follow the DNS instructions — add a CNAME record at your domain registrar.
4. SSL is automatic and free.

---

## Step 6 — Post-Launch Checklist

- [ ] Test sign-up flow on the live site
- [ ] Confirm you can log in as admin
- [ ] Create your first survey in Admin → Surveys
- [ ] Test completing a survey as a regular user
- [ ] Check points appear on the dashboard
- [ ] Submit a test withdrawal and approve it as admin
- [ ] Set up real SMTP in Supabase for email confirmations
- [ ] In Supabase → Auth → URL Configuration, set **Site URL** to your Vercel URL

---

## Useful Commands

```bash
npm run dev       # Start local dev server
npm run build     # Build for production (catches errors)
npm run start     # Run production build locally
```

---

## Troubleshooting

**"relation does not exist" error** → The schema SQL didn't run fully. Re-run `supabase-schema.sql` in the SQL editor.

**Redirected to login immediately** → Your env variables are wrong or missing. Double-check `.env.local`.

**Email confirmation not arriving** → In Supabase Auth settings, you can disable email confirmation for testing. Re-enable it for production.

**Admin panel shows "Access Denied"** → Your profile role is still `user`. Update it in Supabase Table Editor.
