import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { allEdit, cleanPerms, type Perms, type SectionId } from "@/lib/consoleSections";

/**
 * Owner-console login. The main owner's username/password come from server
 * environment variables (ADMIN_USERNAME / ADMIN_PASSWORD). Extra console users
 * (and an owner's changed password) live in the server-only `console_users`
 * table, with scrypt-hashed passwords. A signed HTTP-only cookie keeps the
 * session for 8 hours.
 */
const COOKIE = "zb_admin";
const TTL_MS = 8 * 60 * 60 * 1000;

const sha = (s: string) => createHash("sha256").update(s).digest();
const secret = () => process.env.ADMIN_SESSION_SECRET || `${process.env.ADMIN_PASSWORD ?? ""}|zenbiz-admin-session`;
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");

export type ConsoleSession = { id: string; username: string; role: string; isSuper: boolean; perms: Perms };

export function adminConfigured() {
  return !!(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString("hex")}`;
}
function verifyPassword(pw: string, stored: string) {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const a = Buffer.from(scryptSync(pw, salt, 64).toString("hex"));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Row = { id: string; username: string; password_hash: string; role_name: string; permissions: unknown; active: boolean; is_super: boolean };

/** Checks the credentials and returns the id to put in the session cookie. */
export async function checkConsoleLogin(user: string, pass: string): Promise<{ id: string } | null> {
  const u = user.trim();
  if (!u || !pass) return null;
  try {
    const { data } = (await createAdminClient().from("console_users" as never).select("*").eq("username", u.toLowerCase()).maybeSingle()) as { data: Row | null };
    if (data) {
      if (!data.active) return null;
      return verifyPassword(pass, data.password_hash) ? { id: data.id } : null;
    }
  } catch {
    /* table missing yet: fall through to the env owner */
  }
  if (adminConfigured()) {
    const a = timingSafeEqual(sha(u), sha(process.env.ADMIN_USERNAME!));
    const b = timingSafeEqual(sha(pass), sha(process.env.ADMIN_PASSWORD!));
    if (a && b) return { id: "env" };
  }
  return null;
}

export function startAdminSession(id: string) {
  const exp = String(Date.now() + TTL_MS);
  cookies().set(COOKIE, `${exp}.${id}.${sign(`${exp}.${id}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export function endAdminSession() {
  cookies().delete(COOKIE);
}

/** The signed-in console user, or null. Re-reads the DB so access changes apply at once. */
export async function getConsoleSession(): Promise<ConsoleSession | null> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const [exp, id, sig] = raw.split(".");
  if (!exp || !id || !sig || Number(exp) < Date.now()) return null;
  const good = sign(`${exp}.${id}`);
  if (sig.length !== good.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;

  if (id === "env") {
    if (!adminConfigured()) return null;
    return { id, username: process.env.ADMIN_USERNAME!, role: "Owner", isSuper: true, perms: allEdit() };
  }
  try {
    const { data } = (await createAdminClient().from("console_users" as never).select("*").eq("id", id).maybeSingle()) as { data: Row | null };
    if (!data || !data.active) return null;
    return {
      id: data.id,
      username: data.username,
      role: data.is_super ? "Owner" : data.role_name,
      isSuper: data.is_super,
      perms: data.is_super ? allEdit() : cleanPerms(data.permissions),
    };
  } catch {
    return null;
  }
}

export const canView = (s: ConsoleSession | null, sec: SectionId) => !!s && (s.perms[sec] === "view" || s.perms[sec] === "edit");
export const canEdit = (s: ConsoleSession | null, sec: SectionId) => !!s && s.perms[sec] === "edit";
