-- =============================================================================
-- ZEN BIZ — MIGRATION 16 (Global language preference)
-- =============================================================================
-- Adds a language column to profiles so the selected display language
-- (menus, buttons, system messages) persists per owner across devices
-- and survives logout/login, not just localStorage on one browser.
--
-- Safe to run even if already applied.
-- =============================================================================

alter table public.profiles add column if not exists language text not null default 'en';
