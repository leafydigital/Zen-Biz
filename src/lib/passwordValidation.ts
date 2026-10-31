/**
 * Standard password strength rule used everywhere a Zen Biz account
 * password is set (signup, password reset): at least 8 characters, one
 * capital letter, one symbol. Returns the specific reason it fails, or
 * null if the password passes, so the caller can show exactly what's
 * missing rather than a generic "invalid password".
 */
export function passwordIssue(value: string): string | null {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(value)) return "Password must include at least one capital letter.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Password must include at least one symbol (e.g. ! @ # $ %).";
  return null;
}
