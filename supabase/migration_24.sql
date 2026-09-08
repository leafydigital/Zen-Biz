-- =============================================================================
-- ZEN BIZ — MIGRATION 24 (Grant get_user_id_by_email to anon)
-- =============================================================================
-- get_user_id_by_email() was only granted to `authenticated`, but the
-- signup form needs to call it BEFORE the person has an account or
-- session — the same situation get_email_by_phone() already correctly
-- handles (granted to anon, authenticated). This brings the email
-- lookup in line with that, so signup can check "does this email
-- already have an account?" up front and give an honest message instead
-- of Supabase's default silent-success-either-way behavior.
--
-- Still narrow and safe: the function only ever returns a user id (or
-- null) for an exact email match — nothing else about the account.
--
-- Safe to re-run.
-- =============================================================================

grant execute on function public.get_user_id_by_email(text) to anon, authenticated;
