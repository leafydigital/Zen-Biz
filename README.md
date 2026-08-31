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

**Already ran schema.sql before and have data in your app?** Run these
migration files below, in order, instead of repeating schema.sql — they
update your existing database without deleting anything you've already
entered:
1. `supabase/migration_2.sql` — flexible business types, logo, GST number
2. `supabase/migration_3.sql` — Suppliers, Purchases, Quotation line items,
   and automatic stock adjustment (buying increases stock, selling
   decreases it)
3. `supabase/migration_4.sql` — Invoice/Quotation design settings (paper
   size, style, font size)
4. `supabase/migration_5.sql` — Payment method (cash/bank/cheque) on
   invoices and purchases, and a proper unit field on every line item
5. `supabase/migration_6.sql` — Item Code and HSN Code on products and
   every line item
6. `supabase/migration_7.sql` — Terms & Conditions and Signature/Seal per
   document type (Invoice/Quotation/Purchase), plus independent Purchase
   design settings
7. `supabase/migration_8.sql` — an intermediate plan-tier update from
   earlier in development (free/basic/premium) — safe to skip entirely if
   you're setting up fresh, since migration_9.sql below handles the
   conversion from either naming
8. `supabase/migration_9.sql` — **Current plan structure**: renames plans to
   Starter/Professional/Business (from either the original free/paid
   naming or the intermediate free/basic/premium naming), adds Delivery
   Challan, and adds the subscription_payments table for Razorpay checkout
9. `supabase/migration_10.sql` — Consolidates Invoice/Quotation/Purchase
   design settings and signature into one shared setting, adds separate
   bank details + payment QR code (shared), a per-document currency picker
   (invoices/quotations/purchases can each be a different currency), and
   removes the old Terms & Signature edit limit — editing is unlimited on
   every plan now
10. `supabase/migration_11.sql` — Due Date (invoices) / Valid Until
    (quotations), optional Ship To address, and a per-line Tax % on every
    line item
11. `supabase/migration_12.sql` — Default Tax % and an optional photo on
    Products (auto-fills onto invoice/quotation/purchase lines when that
    product is selected)
12. `supabase/migration_13.sql` — The "Create Invoice" premium redesign:
    State (on your business Settings, Customers, and Suppliers) for
    automatic CGST+SGST vs IGST splitting; GSTIN on Customers/Suppliers;
    Partial payment status with amount paid/due tracking; UPI and Credit
    Card added as payment methods; Tax Type (GST Inclusive/Exclusive/
    Exempt/Non-GST Supply); per-line Discount %; and Delivery Address /
    Vehicle Number / Transport Name on Invoices, Quotations, and Purchases

**If you're setting up completely fresh:** just run `schema.sql` — it
already includes everything above in one file. You never need to touch the
numbered migration files.

**If you already have data and are catching up:** run `migration_9.sql`
through `migration_13.sql`, in that order — you can skip `migration_8.sql`
entirely (it was an intermediate step superseded by migration_9). If you're
not sure which of these you've already run, it's safe to just run all of
them again — every statement in them uses "add column if not exists" style
guards, so re-running a migration that already applied does nothing
harmful.

If you've already run some of these before, you only need to run the ones
you haven't. Skip to step 4 after running whichever applies to you.

**Starting fresh?** Follow the steps below as normal — schema.sql already
includes everything from both migrations.

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

## 6b. Set up real payments (Razorpay)

The Professional and Business plan checkout flow is fully built — it just
needs your Razorpay credentials to actually go live. Until you add these,
clicking "Upgrade" will show a clear "payments aren't set up yet" message
instead of a broken checkout.

1. Create an account at [razorpay.com](https://razorpay.com) (needs basic
   business KYC to accept real payments, but you can test with their test
   mode keys before that's approved).
2. Go to **Settings → API Keys** → generate a Key ID and Key Secret.
3. Add to your environment variables (both locally in `.env.local`, and in
   Vercel's project settings):
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same value as `RAZORPAY_KEY_ID` — this
     one is exposed to the browser to open the checkout popup, which is
     safe; the secret never is)
4. Get your Supabase **service role key**: Supabase → **Settings → API** →
   copy the `service_role` key (careful — this one bypasses all privacy
   rules, never expose it to the browser). Add it as:
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Set up the webhook so Razorpay tells Zen Biz when a payment succeeds:
   - Razorpay Dashboard → **Settings → Webhooks** → **Add New Webhook**
   - URL: `https://yourdomain.com/api/razorpay/webhook`
   - Active events: `payment.captured` and `payment.failed`
   - Razorpay will show you a **Webhook Secret** — add it as:
     `RAZORPAY_WEBHOOK_SECRET`
6. Redeploy after adding these environment variables (Vercel needs a fresh
   deploy to pick up new env vars).

**How the money flow works, in short:** the browser never marks its own
payment as successful — only Razorpay's server-to-server webhook call does
that, after Zen Biz verifies the call is genuinely from Razorpay (via HMAC
signature check). This means nobody can fake an upgrade by just calling the
API directly.

---

## 7. Moving to a mobile app later

Because this is a responsive web app (not native), the fastest path to
mobile is usually wrapping it (e.g. with Capacitor) or rebuilding the UI in
React Native while reusing the same Supabase backend and the same
`src/types/database.ts` shapes — your data and login system don't need to
change at all.

---

## 7b. A current limitation worth knowing

PDF generation (invoices, quotations, purchases) produces a single page —
there's no automatic page-2-onward if a document has a very large number of
line items, long notes, or long Terms & Conditions text. In that case,
content near the bottom (the footer note, or in extreme cases the
signature/terms block) may run past the visible page rather than flowing
onto a new page. For most real invoices this won't come up, but a document
with 30+ line items plus long terms text is worth double-checking with the
"Download preview PDF" button in Settings before relying on it.

---

## 8. Current plan structure & what's still pending

**Phase 1 is fully built**, mapped to three tiers (see `src/lib/planFeatures.ts`
for the single source of truth on what each tier includes):

| | Starter (free) | Professional | Business |
|---|---|---|---|
| Products, Customers, Invoices, Quotations | ✓ | ✓ | ✓ |
| Invoice watermark | Yes | No | No |
| Purchases & Suppliers | — | ✓ | ✓ |
| Delivery Challan | — | ✓ | ✓ |
| GST billing, GST report, HSN printing | — | — | ✓ |
| Profit & Loss report | — | — | ✓ |
| Colourful document styles | — | — | ✓ |

**Not yet built** (mentioned in the tier spec but intentionally deferred —
ask if you want any of these prioritized next):
- Share via WhatsApp/email (currently: download PDF only)
- Expense tracking module
- Invoice tracking statuses beyond Paid/Unpaid/Cancelled (Sent/Viewed/Overdue)
- Multiple users & roles per account
- Low stock alerts
- Customer outstanding report
- View / Edit / Delete pages for Quotations, Purchases, and Delivery
  Challans (Invoices already have all three — see `/dashboard/invoices/[id]`)

**Invoice/Quotation PDF layout** now includes: business logo in the header,
a boxed metadata table (No./Date/Due Date or Valid Until/Currency), Bill To
and Ship To side by side with small icon badges, a per-line Tax % column,
and bank details + payment QR near the signature block. Real card-network
logos (Visa/Mastercard/PayPal) are intentionally not reproduced — those are
trademarked marks — a plain "We accept: Bank Transfer, UPI, Cash, Cheque"
line is shown instead.

The database already has room for GST billing to switch on without a
migration — `gst_enabled`/`gst_percent`/`gst_amount` exist on every
invoice/purchase row, just unused (0/false) until GST billing is turned on
for Business-plan accounts.

**GST/tax calculation is now genuinely wired up** via per-line Tax % on
every invoice, quotation, and purchase item — plus a default Tax % saved on
each Product, which auto-fills onto a line the moment that product is
selected (still editable per line). This satisfies real per-line tax needs
without waiting on the Business-plan-only `gst_enabled` toggle, which
remains a separate, still-unused flag reserved for the eventual formal GST
billing feature (return filing, GSTR-style reporting) rather than everyday
tax calculation.

**HSN code suggestions** come from a built-in offline reference list
(`src/lib/hsnReference.ts`), matched by keyword against the product name —
there's no free public government API for a live HSN lookup, so this is a
starting point, not an authoritative source. Always confirm the exact HSN
code with a tax professional or the official GST rate finder before relying
on it for filing.

**Product photos** are optional and stored in a new `product-images`
storage bucket, shown as a thumbnail on the product card — not yet printed
on invoice/quotation/purchase PDFs (only the text description and item
code print there currently).

---

## 9. SEO setup (once you have a live domain)

Zen Biz already includes: page titles & descriptions, Open Graph/Twitter
preview cards, an FAQ section with rich-result structured data, a sitemap,
and a robots.txt — all generated automatically. Two things to finish once
you have a real domain:

1. **Update the domain placeholder.** Open these files and change
   `https://zenbiz.app` to your real domain (custom domain or your Netlify
   URL):
   - `src/app/layout.tsx` (the `SITE_URL` constant near the top)
   - `src/app/sitemap.ts` and `src/app/robots.ts` (same constant, kept in
     sync manually since each file runs independently)

2. **Add a social preview image.** Save a 1200×630px image as
   `public/og-image.png` — this is what shows up when your link is shared
   on WhatsApp, Twitter/X, LinkedIn, etc. Create a `public` folder in the
   project root if it doesn't exist yet.

3. **Submit to Google Search Console** (free, once live):
   - Go to [search.google.com/search-console](https://search.google.com/search-console)
   - Add your domain, verify ownership (Google walks you through this)
   - Submit your sitemap URL: `https://yourdomain.com/sitemap.xml`
   - This tells Google about your site much faster than waiting to be
     found naturally.
