-- Business email: shown on documents emailed from Zen Biz as the Reply-To address.
alter table public.businesses add column if not exists email text;
