# Zen Biz

A private business ledger for small businesses — track products/services,
customers, and invoices. Built for travel agencies, jewellery shops, and
general retail. Works on laptop, tablet, and mobile from one codebase.

**Free version includes:** products/services catalog, customers, simple
invoices (no GST) with PDF download.
**Locked for paid version (already wired in the database, not yet unlocked in
the UI):** GST billing, Quotations.

---

## 1. How data privacy works (read this first)

Every table (`products`, `customers`, `invoices`, etc.) has an `owner_id`
column, and Postgres **Row Level Security (RLS)** policies guarantee that a
signed-in user can only ever read or write rows where `owner_id` matches
their own account. This is enforced by the database itself, not by the app's
interface — so:

- If Gmail account A logs in, it only ever sees what account A created.
- If Gmail account B logs in on the same browser or device, it starts
  completely fresh — it cannot see account A's data, even by accident or
  by tampering with the app.

This is set up in `supabase/schema.sql`. **You must run this file once** in
your Supabase project before the app will work (step 3 below).

---

## 2. Project structure

```
src/
  app/                    Pages (Next.js App Router)
    login/, signup/       Auth pages
    onboarding/           First-time business setup (name + type)
    dashboard/            Main app (protected — requires login)
      products/           Product/service catalog
      customers/          Customer list
      invoices/           Invoice list + new invoice builder
      quotations/         Locked "paid feature" placeholder
    auth/callback/        Handles Google/email login redirect
  components/             Reusable UI pieces
  lib/
    supabase/             Database client setup (browser, server, middleware)
    businessLabels.ts     Swaps wording based on business type
    generateInvoicePdf.ts Builds the invoice PDF
  types/database.ts       All data shapes — matches schema.sql exactly
  middleware.ts           Protects /dashboard routes, redirects signed-in
                           users away from login/signup
supabase/schema.sql        Run this in Supabase to create every table + all
                           security rules
```

**Why this matters for switching databases later:** every database call goes
through `src/lib/supabase/*`. If you ever move off Supabase (e.g. to Google
Cloud SQL), you only need to rewrite those three files and swap
`src/types/database.ts` — no page or component needs to change, since they
all just call `supabase.from("products")...` etc. without knowing where the
data actually lives.

---

## 3. Set up Supabase (database + login)

**Already ran schema.sql before and have data in your app?** Run
`supabase/migration_2.sql` instead of repeating schema.sql — it updates your
existing database (flexible business types, logo, GST number) without
deleting anything you've already entered. Skip to step 4 after that.

**Starting fresh?** Follow the steps below as normal — schema.sql already
includes everything.

1. Create a free project at [supabase.com](https://supabase.com).
2. In your project, go to **SQL Editor** → paste in the entire contents of
   `supabase/schema.sql` → click **Run**. This creates all tables and
   security rules in one go.
3. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon public` key
4. Create a file named `.env.local` in the project root (copy
   `.env.local.example`) and paste those two values in.

### Enable Google login
1. In Supabase: **Authentication → Providers → Google** → toggle it on.
2. You'll need a Google OAuth Client ID/Secret from
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create an OAuth 2.0 Client ID (Web application).
   - Authorized redirect URI: use the callback URL Supabase shows you on that
     same Providers page (looks like
     `https://your-project-ref.supabase.co/auth/v1/callback`).
3. Paste the Client ID and Secret into Supabase's Google provider settings
   and save.

### Enable email/password login
This is on by default in Supabase (**Authentication → Providers → Email**).
No extra setup needed. You may want to turn off "Confirm email" while
testing so you don't need to click a confirmation link every time.

---

## 4. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

---

## 5. Put it on GitHub

```bash
git init
git add .
git commit -m "Zen Biz v1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zenbiz.git
git push -u origin main
```

(`.env.local` is already excluded via `.gitignore` — never commit it.)

---

## 6. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your
   GitHub repo.
2. In the import screen, add the same two environment variables from your
   `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Click **Deploy**.
4. Once deployed, go back to Supabase → **Authentication → URL
   Configuration** and add your Vercel URL (e.g.
   `https://zenbiz.vercel.app`) to both **Site URL** and **Redirect URLs** —
   otherwise Google/email login redirects will fail on the live site.

---

## 7. Moving to a mobile app later

Because this is a responsive web app (not native), the fastest path to
mobile is usually wrapping it (e.g. with Capacitor) or rebuilding the UI in
React Native while reusing the same Supabase backend and the same
`src/types/database.ts` shapes — your data and login system don't need to
change at all.

---

## 8. What's next (paid features, already planned for)

The database already has the columns/tables ready so adding these later
won't require deleting or migrating existing data:
- GST fields on invoices (`gst_enabled`, `gst_percent`, `gst_amount`)
- Full Quotations module (table already exists: `quotations`)
