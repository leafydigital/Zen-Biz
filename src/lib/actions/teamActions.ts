"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { getPlanFeatures } from "@/lib/planFeatures";
import { passwordIssue } from "@/lib/passwordValidation";
import { USERNAME_PATTERN, normalizeUsername, usernameToEmail } from "@/lib/teamUsername";
import type { BusinessRole, Plan } from "@/types/database";

export type TeamRole = "admin" | "manager" | "staff";
/** "admin" | "manager" | "staff" | "custom:<role uuid>" */
export type RoleKey = string;

const NAME_PATTERN = /^\p{L}[\p{L}\p{M} ]+$/u;
const ASSIGNABLE: TeamRole[] = ["admin", "manager", "staff"];
const NAME_ERROR = "Name can contain letters and spaces only — no numbers or symbols.";

type Caller = { userId: string; role: BusinessRole; ownerId: string };

/** Who is calling, and are they owner/admin of this business? Never trusts the client. */
async function getManager(businessId: string): Promise<{ caller?: Caller; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (and your Vercel environment variables), then restart." };
  }

  const [{ data: membership }, { data: business }] = await Promise.all([
    supabase
      .from("business_members" as never)
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle() as unknown as Promise<{ data: { role: BusinessRole } | null }>,
    supabase
      .from("businesses" as never)
      .select("owner_id")
      .eq("id", businessId)
      .maybeSingle() as unknown as Promise<{ data: { owner_id: string } | null }>,
  ]);

  if (!business || !membership) return { error: "You don't have access to this business." };
  const isOwner = business.owner_id === user.id;
  const role: BusinessRole = isOwner ? "owner" : membership.role;
  if (role !== "owner" && role !== "admin") {
    return { error: "Only the owner or an admin can manage team members." };
  }
  return { caller: { userId: user.id, role, ownerId: business.owner_id } };
}

async function resolveRole(
  ownerId: string,
  key: RoleKey
): Promise<{ role: TeamRole; roleId: string | null } | null> {
  if (key.startsWith("custom:")) {
    const admin = createAdminClient();
    const { data } = (await admin
      .from("business_roles" as never)
      .select("id")
      .eq("id", key.slice(7))
      .eq("owner_id", ownerId)
      .maybeSingle()) as { data: { id: string } | null };
    return data ? { role: "staff", roleId: data.id } : null;
  }
  return (ASSIGNABLE as string[]).includes(key) ? { role: key as TeamRole, roleId: null } : null;
}

/** All business ids owned by this owner (the only ones a team user can ever be given). */
async function ownerBusinessIds(ownerId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = (await admin.from("businesses" as never).select("id").eq("owner_id", ownerId)) as {
    data: { id: string }[] | null;
  };
  return (data ?? []).map((b) => b.id);
}

async function getTarget(businessId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = (await admin
    .from("business_members" as never)
    .select("role, username, full_name, role_id, is_active")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle()) as {
    data: { role: BusinessRole; username: string | null; full_name: string | null; role_id: string | null; is_active: boolean } | null;
  };
  return data;
}

/** Admins may only touch manager/staff; only the owner may touch admins. */
function canTouch(caller: Caller, targetRole: BusinessRole, newRole?: TeamRole) {
  if (targetRole === "owner") return false;
  if (caller.role === "owner") return true;
  if (targetRole === "admin") return false;
  if (newRole === "admin") return false;
  return true;
}

async function planUserLimitError(ownerId: string, businessId: string, plan: Plan) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("business_members" as never)
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);
  const limit = getPlanFeatures(plan).limits.users;
  if (limit !== null && (count ?? 0) >= limit) {
    return plan === "starter"
      ? "Starter includes 1 user. Upgrade to Professional to add another user."
      : `Your plan includes up to ${limit} users per business. Upgrade to a higher plan to add more.`;
  }
  return null;
}

export async function createTeamUser(
  businessId: string,
  input: { fullName: string; username: string; password: string; role: RoleKey; businessIds?: string[] }
) {
  const { caller, error } = await getManager(businessId);
  if (!caller) return { error };

  const fullName = input.fullName.trim();
  const username = normalizeUsername(input.username);
  if (!NAME_PATTERN.test(fullName)) return { error: NAME_ERROR };
  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Username must be 3–30 characters: lowercase letters, numbers, dot or underscore." };
  }
  const resolved = await resolveRole(caller.ownerId, input.role);
  if (!resolved) return { error: "Choose a valid role." };
  if (!canTouch(caller, "staff", resolved.role)) {
    return { error: "Only the business owner can create another admin." };
  }
  const pwError = passwordIssue(input.password);
  if (pwError) return { error: pwError };

  // Which businesses: owner may tick several; an admin only the current one.
  let targets = [businessId];
  if (caller.role === "owner" && input.businessIds?.length) {
    const mine = await ownerBusinessIds(caller.ownerId);
    targets = input.businessIds.filter((id) => mine.includes(id));
    if (targets.length === 0) return { error: "Choose at least one business." };
  }

  const admin = createAdminClient();
  const { data: ownerProfile } = (await admin
    .from("profiles" as never)
    .select("plan")
    .eq("id", caller.ownerId)
    .maybeSingle()) as { data: { plan: Plan } | null };
  const plan = ownerProfile?.plan ?? "starter";

  for (const id of targets) {
    const limitErr = await planUserLimitError(caller.ownerId, id, plan);
    if (limitErr) return { error: limitErr };
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username, team_user: true },
  });
  if (createErr || !created.user) {
    if (/already|registered|exists/i.test(createErr?.message ?? "")) {
      return { error: "That username is already taken. Try another." };
    }
    return { error: createErr?.message ?? "Could not create the user." };
  }
  const newId = created.user.id;

  await admin.from("profiles" as never).upsert(
    { id: newId, business_name: "", onboarding_complete: true, plan } as never
  );

  const { error: memberErr } = await admin.from("business_members" as never).insert(
    targets.map((id) => ({
      business_id: id,
      user_id: newId,
      role: resolved.role,
      role_id: resolved.roleId,
      full_name: fullName,
      username,
    })) as never
  );
  if (memberErr) {
    await admin.auth.admin.deleteUser(newId);
    return { error: `Could not add the user (${memberErr.message}).` };
  }

  revalidatePath("/dashboard", "layout");
  return { error: null };
}

export async function updateTeamUser(
  businessId: string,
  userId: string,
  input: { fullName?: string; role?: RoleKey; password?: string; active?: boolean; businessIds?: string[] }
) {
  const { caller, error } = await getManager(businessId);
  if (!caller) return { error };

  const target = await getTarget(businessId, userId);
  if (!target) return { error: "Team member not found." };
  if (userId === caller.userId) return { error: "You can't edit your own role here." };

  const resolvedRole = input.role ? await resolveRole(caller.ownerId, input.role) : null;
  if (input.role && !resolvedRole) return { error: "Choose a valid role." };
  if (!canTouch(caller, target.role, resolvedRole?.role)) {
    return { error: "You don't have permission to edit this member." };
  }
  const isTeamUser = !!target.username;
  if ((input.password || input.active !== undefined) && !isTeamUser) {
    return { error: "Password and access can only be managed for users created here." };
  }
  if (input.fullName !== undefined && !NAME_PATTERN.test(input.fullName.trim())) return { error: NAME_ERROR };
  if (input.password) {
    const pwError = passwordIssue(input.password);
    if (pwError) return { error: pwError };
  }

  const admin = createAdminClient();
  const mine = await ownerBusinessIds(caller.ownerId);

  // Business access (owner only): add / remove memberships across this owner's businesses.
  if (input.businessIds && caller.role === "owner") {
    const wanted = input.businessIds.filter((id) => mine.includes(id));
    if (wanted.length === 0) return { error: "Choose at least one business." };

    const { data: existingRows } = (await admin
      .from("business_members" as never)
      .select("business_id")
      .eq("user_id", userId)
      .in("business_id", mine)) as { data: { business_id: string }[] | null };
    const existing = (existingRows ?? []).map((r) => r.business_id);

    const { data: ownerProfile } = (await admin
      .from("profiles" as never)
      .select("plan")
      .eq("id", caller.ownerId)
      .maybeSingle()) as { data: { plan: Plan } | null };

    const toAdd = wanted.filter((id) => !existing.includes(id));
    for (const id of toAdd) {
      const limitErr = await planUserLimitError(caller.ownerId, id, ownerProfile?.plan ?? "starter");
      if (limitErr) return { error: limitErr };
    }
    if (toAdd.length) {
      const { error: addErr } = await admin.from("business_members" as never).insert(
        toAdd.map((id) => ({
          business_id: id,
          user_id: userId,
          role: resolvedRole?.role ?? target.role,
          role_id: resolvedRole ? resolvedRole.roleId : target.role_id,
          full_name: target.full_name,
          username: target.username,
          is_active: target.is_active,
        })) as never
      );
      if (addErr) return { error: addErr.message };
    }
    const toRemove = existing.filter((id) => !wanted.includes(id));
    if (toRemove.length) {
      await admin.from("business_members" as never).delete().eq("user_id", userId).in("business_id", toRemove);
    }
  }

  // Name / role / active apply to every one of this owner's businesses the user is in.
  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName.trim();
  if (resolvedRole) {
    patch.role = resolvedRole.role;
    patch.role_id = resolvedRole.roleId;
  }
  if (input.active !== undefined) patch.is_active = input.active;
  if (Object.keys(patch).length > 0) {
    const { error: upErr } = await admin
      .from("business_members" as never)
      .update(patch as never)
      .eq("user_id", userId)
      .in("business_id", mine);
    if (upErr) return { error: upErr.message };
  }

  if (isTeamUser && (input.password || input.active !== undefined || input.fullName)) {
    const authPatch: Record<string, unknown> = {};
    if (input.password) authPatch.password = input.password;
    if (input.active !== undefined) authPatch.ban_duration = input.active ? "none" : "876000h";
    if (input.fullName) {
      authPatch.user_metadata = { full_name: input.fullName.trim(), username: target.username, team_user: true };
    }
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, authPatch as never);
    if (authErr) return { error: authErr.message };
  }

  revalidatePath("/dashboard", "layout");
  return { error: null };
}

export async function removeTeamUser(businessId: string, userId: string) {
  const { caller, error } = await getManager(businessId);
  if (!caller) return { error };
  const target = await getTarget(businessId, userId);
  if (!target) return { error: "Team member not found." };
  if (userId === caller.userId) return { error: "You can't remove yourself." };
  if (!canTouch(caller, target.role)) return { error: "You don't have permission to remove this member." };

  const admin = createAdminClient();
  await admin.from("business_members" as never).delete().eq("business_id", businessId).eq("user_id", userId);

  // Username accounts exist only for this team: delete the login when no business is left.
  if (target.username) {
    const { count } = await admin
      .from("business_members" as never)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (!count) await admin.auth.admin.deleteUser(userId);
  }

  revalidatePath("/dashboard", "layout");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Custom roles (owner only): a name plus ticked access areas. Shared by all
// of the owner's businesses.
// ---------------------------------------------------------------------------
async function requireOwner(businessId: string) {
  const { caller, error } = await getManager(businessId);
  if (!caller) return { error, ownerId: "" };
  if (caller.role !== "owner") return { error: "Only the business owner can manage roles.", ownerId: "" };
  return { error: null, ownerId: caller.ownerId };
}

export async function saveRole(
  businessId: string,
  input: { id?: string; name: string; permissions: string[] }
) {
  const own = await requireOwner(businessId);
  if (own.error) return { error: own.error };

  const name = input.name.trim();
  if (!/^\p{L}[\p{L}\p{M} ]{1,29}$/u.test(name)) {
    return { error: "Role name: letters and spaces only, 2–30 characters." };
  }
  // Edit implies view.
  const set = new Set(input.permissions.filter((p) => ALL_PERMISSION_KEYS.includes(p)));
  for (const p of Array.from(set)) {
    if (p.endsWith(":edit")) set.add(p.replace(":edit", ":view"));
  }

  const admin = createAdminClient();
  const row = { name, permissions: Array.from(set) };
  const res = input.id
    ? await admin.from("business_roles" as never).update(row as never).eq("id", input.id).eq("owner_id", own.ownerId)
    : await admin.from("business_roles" as never).insert({ ...row, business_id: businessId, owner_id: own.ownerId } as never);
  if (res.error) {
    return { error: /duplicate|unique/i.test(res.error.message) ? "A role with that name already exists." : res.error.message };
  }
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

export async function deleteRole(businessId: string, roleId: string) {
  const own = await requireOwner(businessId);
  if (own.error) return { error: own.error };
  const admin = createAdminClient();
  const { error } = await admin.from("business_roles" as never).delete().eq("id", roleId).eq("owner_id", own.ownerId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { error: null };
}
