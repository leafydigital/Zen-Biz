-- =============================================================================
-- ZEN BIZ — FULL COLUMN SYNC (run this whenever you get a "column not found"
-- or "relation does not exist" error)
-- =============================================================================
-- This adds every column the app currently expects, on every table, using
-- "add column if not exists" — so it's completely safe to run no matter
-- which columns you already have. It does NOT delete or change any data
-- you've already entered.
--
-- If a table itself is missing entirely (a different error: "relation
-- ... does not exist"), run supabase/schema.sql FIRST — that one creates
-- any missing tables — then come back and run this file to be sure every
-- column matches too.
-- =============================================================================

-- ---------- profiles ----------
alter table public.profiles add column if not exists business_name text not null default '';
alter table public.profiles add column if not exists business_type text not null default '';
alter table public.profiles add column if not exists logo_url text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists gst_number text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists plan text not null default 'starter';
alter table public.profiles add column if not exists billing_cycle text;
alter table public.profiles add column if not exists plan_renews_at timestamptz;
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;
alter table public.profiles add column if not exists document_design jsonb not null default '{"paperSize": "a4", "style": "default", "fontSize": 10}'::jsonb;
alter table public.profiles add column if not exists signature_url text;
alter table public.profiles add column if not exists invoice_terms text;
alter table public.profiles add column if not exists quotation_terms text;
alter table public.profiles add column if not exists purchase_terms text;
alter table public.profiles add column if not exists bank_name text;
alter table public.profiles add column if not exists bank_account_name text;
alter table public.profiles add column if not exists bank_account_number text;
alter table public.profiles add column if not exists bank_ifsc_or_swift text;
alter table public.profiles add column if not exists payment_qr_url text;
alter table public.profiles add column if not exists default_currency text not null default 'INR';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- ---------- products ----------
alter table public.products add column if not exists owner_id uuid;
alter table public.products add column if not exists name text not null default '';
alter table public.products add column if not exists description text;
alter table public.products add column if not exists price numeric(12, 2) not null default 0;
alter table public.products add column if not exists unit text not null default 'item';
alter table public.products add column if not exists stock_qty numeric(12, 2);
alter table public.products add column if not exists category text;
alter table public.products add column if not exists item_code text;
alter table public.products add column if not exists hsn_code text;
alter table public.products add column if not exists tax_percent numeric(5, 2) not null default 0;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists is_active boolean not null default true;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();

-- ---------- customers ----------
alter table public.customers add column if not exists owner_id uuid;
alter table public.customers add column if not exists name text not null default '';
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists state text;
alter table public.customers add column if not exists gstin text;
alter table public.customers add column if not exists notes text;
alter table public.customers add column if not exists created_at timestamptz not null default now();
alter table public.customers add column if not exists updated_at timestamptz not null default now();

-- ---------- invoices ----------
alter table public.invoices add column if not exists owner_id uuid;
alter table public.invoices add column if not exists customer_id uuid;
alter table public.invoices add column if not exists invoice_number text not null default '';
alter table public.invoices add column if not exists invoice_date date not null default current_date;
alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists status text not null default 'unpaid';
alter table public.invoices add column if not exists payment_method text;
alter table public.invoices add column if not exists amount_paid numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists currency text not null default 'INR';
alter table public.invoices add column if not exists ship_to_name text;
alter table public.invoices add column if not exists ship_to_address text;
alter table public.invoices add column if not exists delivery_address text;
alter table public.invoices add column if not exists vehicle_number text;
alter table public.invoices add column if not exists transport_name text;
alter table public.invoices add column if not exists tax_type text not null default 'exclusive';
alter table public.invoices add column if not exists place_of_supply_state text;
alter table public.invoices add column if not exists subtotal numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists gst_enabled boolean not null default false;
alter table public.invoices add column if not exists gst_percent numeric(5, 2) not null default 0;
alter table public.invoices add column if not exists gst_amount numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists cgst_amount numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists sgst_amount numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists igst_amount numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists round_off numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists total numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists notes text;
alter table public.invoices add column if not exists created_at timestamptz not null default now();
alter table public.invoices add column if not exists updated_at timestamptz not null default now();

-- ---------- invoice_items ----------
alter table public.invoice_items add column if not exists owner_id uuid;
alter table public.invoice_items add column if not exists invoice_id uuid;
alter table public.invoice_items add column if not exists product_id uuid;
alter table public.invoice_items add column if not exists description text not null default '';
alter table public.invoice_items add column if not exists quantity numeric(12, 2) not null default 1;
alter table public.invoice_items add column if not exists unit text not null default 'item';
alter table public.invoice_items add column if not exists item_code text;
alter table public.invoice_items add column if not exists hsn_code text;
alter table public.invoice_items add column if not exists unit_price numeric(12, 2) not null default 0;
alter table public.invoice_items add column if not exists discount_percent numeric(5, 2) not null default 0;
alter table public.invoice_items add column if not exists tax_percent numeric(5, 2) not null default 0;
alter table public.invoice_items add column if not exists tax_amount numeric(12, 2) not null default 0;
alter table public.invoice_items add column if not exists line_total numeric(12, 2) not null default 0;
alter table public.invoice_items add column if not exists created_at timestamptz not null default now();

-- ---------- quotations ----------
alter table public.quotations add column if not exists owner_id uuid;
alter table public.quotations add column if not exists customer_id uuid;
alter table public.quotations add column if not exists quotation_number text not null default '';
alter table public.quotations add column if not exists quotation_date date not null default current_date;
alter table public.quotations add column if not exists valid_until date;
alter table public.quotations add column if not exists status text not null default 'draft';
alter table public.quotations add column if not exists currency text not null default 'INR';
alter table public.quotations add column if not exists ship_to_name text;
alter table public.quotations add column if not exists ship_to_address text;
alter table public.quotations add column if not exists delivery_address text;
alter table public.quotations add column if not exists vehicle_number text;
alter table public.quotations add column if not exists transport_name text;
alter table public.quotations add column if not exists tax_type text not null default 'exclusive';
alter table public.quotations add column if not exists place_of_supply_state text;
alter table public.quotations add column if not exists subtotal numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists gst_enabled boolean not null default false;
alter table public.quotations add column if not exists gst_percent numeric(5, 2) not null default 0;
alter table public.quotations add column if not exists gst_amount numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists cgst_amount numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists sgst_amount numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists igst_amount numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists round_off numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists total numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists notes text;
alter table public.quotations add column if not exists created_at timestamptz not null default now();
alter table public.quotations add column if not exists updated_at timestamptz not null default now();

-- ---------- quotation_items ----------
alter table public.quotation_items add column if not exists owner_id uuid;
alter table public.quotation_items add column if not exists quotation_id uuid;
alter table public.quotation_items add column if not exists product_id uuid;
alter table public.quotation_items add column if not exists description text not null default '';
alter table public.quotation_items add column if not exists quantity numeric(12, 2) not null default 1;
alter table public.quotation_items add column if not exists unit text not null default 'item';
alter table public.quotation_items add column if not exists item_code text;
alter table public.quotation_items add column if not exists hsn_code text;
alter table public.quotation_items add column if not exists unit_price numeric(12, 2) not null default 0;
alter table public.quotation_items add column if not exists discount_percent numeric(5, 2) not null default 0;
alter table public.quotation_items add column if not exists tax_percent numeric(5, 2) not null default 0;
alter table public.quotation_items add column if not exists tax_amount numeric(12, 2) not null default 0;
alter table public.quotation_items add column if not exists line_total numeric(12, 2) not null default 0;
alter table public.quotation_items add column if not exists created_at timestamptz not null default now();

-- ---------- suppliers ----------
alter table public.suppliers add column if not exists owner_id uuid;
alter table public.suppliers add column if not exists name text not null default '';
alter table public.suppliers add column if not exists phone text;
alter table public.suppliers add column if not exists email text;
alter table public.suppliers add column if not exists address text;
alter table public.suppliers add column if not exists state text;
alter table public.suppliers add column if not exists gstin text;
alter table public.suppliers add column if not exists notes text;
alter table public.suppliers add column if not exists created_at timestamptz not null default now();
alter table public.suppliers add column if not exists updated_at timestamptz not null default now();

-- ---------- purchases ----------
alter table public.purchases add column if not exists owner_id uuid;
alter table public.purchases add column if not exists supplier_id uuid;
alter table public.purchases add column if not exists purchase_number text not null default '';
alter table public.purchases add column if not exists purchase_date date not null default current_date;
alter table public.purchases add column if not exists status text not null default 'unpaid';
alter table public.purchases add column if not exists payment_method text;
alter table public.purchases add column if not exists amount_paid numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists currency text not null default 'INR';
alter table public.purchases add column if not exists delivery_address text;
alter table public.purchases add column if not exists vehicle_number text;
alter table public.purchases add column if not exists transport_name text;
alter table public.purchases add column if not exists tax_type text not null default 'exclusive';
alter table public.purchases add column if not exists place_of_supply_state text;
alter table public.purchases add column if not exists subtotal numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists gst_enabled boolean not null default false;
alter table public.purchases add column if not exists gst_percent numeric(5, 2) not null default 0;
alter table public.purchases add column if not exists gst_amount numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists cgst_amount numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists sgst_amount numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists igst_amount numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists round_off numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists total numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists notes text;
alter table public.purchases add column if not exists created_at timestamptz not null default now();
alter table public.purchases add column if not exists updated_at timestamptz not null default now();

-- ---------- purchase_items ----------
alter table public.purchase_items add column if not exists owner_id uuid;
alter table public.purchase_items add column if not exists purchase_id uuid;
alter table public.purchase_items add column if not exists product_id uuid;
alter table public.purchase_items add column if not exists description text not null default '';
alter table public.purchase_items add column if not exists quantity numeric(12, 2) not null default 1;
alter table public.purchase_items add column if not exists unit text not null default 'item';
alter table public.purchase_items add column if not exists item_code text;
alter table public.purchase_items add column if not exists hsn_code text;
alter table public.purchase_items add column if not exists unit_price numeric(12, 2) not null default 0;
alter table public.purchase_items add column if not exists discount_percent numeric(5, 2) not null default 0;
alter table public.purchase_items add column if not exists tax_percent numeric(5, 2) not null default 0;
alter table public.purchase_items add column if not exists tax_amount numeric(12, 2) not null default 0;
alter table public.purchase_items add column if not exists line_total numeric(12, 2) not null default 0;
alter table public.purchase_items add column if not exists created_at timestamptz not null default now();

-- ---------- delivery_challans ----------
alter table public.delivery_challans add column if not exists owner_id uuid;
alter table public.delivery_challans add column if not exists customer_id uuid;
alter table public.delivery_challans add column if not exists challan_number text not null default '';
alter table public.delivery_challans add column if not exists challan_date date not null default current_date;
alter table public.delivery_challans add column if not exists status text not null default 'draft';
alter table public.delivery_challans add column if not exists notes text;
alter table public.delivery_challans add column if not exists created_at timestamptz not null default now();
alter table public.delivery_challans add column if not exists updated_at timestamptz not null default now();

-- ---------- delivery_challan_items ----------
alter table public.delivery_challan_items add column if not exists owner_id uuid;
alter table public.delivery_challan_items add column if not exists challan_id uuid;
alter table public.delivery_challan_items add column if not exists product_id uuid;
alter table public.delivery_challan_items add column if not exists description text not null default '';
alter table public.delivery_challan_items add column if not exists quantity numeric(12, 2) not null default 1;
alter table public.delivery_challan_items add column if not exists unit text not null default 'item';
alter table public.delivery_challan_items add column if not exists item_code text;
alter table public.delivery_challan_items add column if not exists created_at timestamptz not null default now();

-- ---------- subscription_payments ----------
alter table public.subscription_payments add column if not exists owner_id uuid;
alter table public.subscription_payments add column if not exists plan text;
alter table public.subscription_payments add column if not exists billing_cycle text;
alter table public.subscription_payments add column if not exists amount numeric(12, 2);
alter table public.subscription_payments add column if not exists currency text not null default 'INR';
alter table public.subscription_payments add column if not exists razorpay_order_id text;
alter table public.subscription_payments add column if not exists razorpay_payment_id text;
alter table public.subscription_payments add column if not exists status text not null default 'created';
alter table public.subscription_payments add column if not exists created_at timestamptz not null default now();
alter table public.subscription_payments add column if not exists updated_at timestamptz not null default now();

-- =============================================================================
-- Done. If you saw any red errors above (not just notices), copy the exact
-- message back — everything else that succeeded has already been applied.
-- =============================================================================
