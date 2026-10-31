/**
 * Team users log in with a username + password. Supabase Auth needs an
 * email, so each username maps to a fixed internal address that is never
 * shown or mailed. Usernames are therefore unique across all of Zen Biz.
 */
export const TEAM_EMAIL_DOMAIN = "team.zenbiz.app";

export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${TEAM_EMAIL_DOMAIN}`;
}
