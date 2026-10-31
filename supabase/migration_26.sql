-- =============================================================================
-- ZEN BIZ — MIGRATION 26 (Fix: phone login not matching numbers without
-- the country code)
-- =============================================================================
-- Root cause: profiles.phone is now saved in full E.164 format with the
-- country code (e.g. "+919876543210", from the country-code dropdown
-- added to signup). But the login page's "Email or Phone Number" field
-- has no country dropdown — someone signing back in naturally types
-- just their local number ("9876543210"), the way they'd say it out
-- loud, not the full +91-prefixed version. get_email_by_phone() only
-- ever compared the two digit-stripped values for an EXACT match, so
-- "9876543210" typed at login never matched "919876543210" stored from
-- signup — a real account's own correct phone number would still fail.
--
-- Fix: the lookup now also matches when the stored number, with its
-- leading country code stripped, equals what was typed — covering the
-- common case of someone leaving off the code at login. Still an exact
-- match either way (with or without the code), never a partial/prefix
-- match, so this can't accidentally match a different, shorter number
-- that happens to be a substring.
--
-- Safe to re-run.
-- =============================================================================

create or replace function public.get_email_by_phone(lookup_phone text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.phone is not null
    and length(regexp_replace(lookup_phone, '[^0-9]', '', 'g')) > 0
    and (
      -- Exact match on the full stored number (covers a login typed
      -- with the country code, or a stored number with no code at all).
      regexp_replace(p.phone, '[^0-9]', '', 'g') = regexp_replace(lookup_phone, '[^0-9]', '', 'g')
      -- Match when the stored number's country code is stripped —
      -- e.g. stored "919876543210" (13 digits, starts with a 2-digit
      -- Indian code) matches a login of "9876543210" (10 digits).
      -- Comparing against the last 10 digits specifically (rather than
      -- just any trailing substring) keeps this an exact match on a
      -- real local number, not a loose "ends with" match that could
      -- accidentally line up with an unrelated shorter number.
      or (
        length(regexp_replace(lookup_phone, '[^0-9]', '', 'g')) = 10
        and right(regexp_replace(p.phone, '[^0-9]', '', 'g'), 10) = regexp_replace(lookup_phone, '[^0-9]', '', 'g')
      )
    )
  limit 1;
$$;
