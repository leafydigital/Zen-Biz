"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTeamUser, updateTeamUser, removeTeamUser, saveRole, deleteRole } from "@/lib/actions/teamActions";
import { PERMISSIONS, SETTINGS_SECTIONS } from "@/lib/permissions";
import type { BusinessRoleRow } from "@/lib/getBusinessRoles";
import { getPlanFeatures } from "@/lib/planFeatures";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";
import type { BusinessMemberWithEmail } from "@/lib/getActiveBusiness";
import type { Plan } from "@/types/database";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";

function EyeToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-soft hover:text-text"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
        {shown && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}

export function TeamManagementTab({
  businessId,
  members,
  currentUserId,
  isOwner,
  canManage,
  plan,
  roles,
  ownerBusinesses,
}: {
  businessId: string;
  members: BusinessMemberWithEmail[];
  currentUserId: string;
  isOwner: boolean;
  canManage: boolean;
  plan: Plan;
  roles: BusinessRoleRow[];
  ownerBusinesses: { id: string; business_name: string }[];
}) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<string>("staff");
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [newBizIds, setNewBizIds] = useState<string[]>([businessId]);
  const [editBizIds, setEditBizIds] = useState<string[]>([]);
  const multiBiz = isOwner && ownerBusinesses.length > 1;
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const [showPw, setShowPw] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);
  const lettersOnly = (v: string) => v.replace(/[^\p{L}\p{M} ]/gu, "");
  const roleOptions: { value: string; label: string }[] = [
    ...(isOwner ? [{ value: "admin", label: "Admin (full access)" }] : []),
    ...roles.map((r) => ({ value: `custom:${r.id}`, label: r.name })),
  ];

  const effectiveRole = roleOptions.some((o) => o.value === role) ? role : roleOptions[0]?.value ?? "";
  const editOptions = roleOptions.some((o) => o.value === editRole)
    ? roleOptions
    : [...roleOptions, { value: editRole, label: `${editRole.charAt(0).toUpperCase()}${editRole.slice(1)} (old role)` }];

  // Role editor (owner only)
  const [roleEditId, setRoleEditId] = useState<string | "new" | null>(null);
  const [roleName, setRoleName] = useState("");
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);

  function openRole(r: BusinessRoleRow | null) {
    setRoleEditId(r ? r.id : "new");
    setRoleName(r?.name ?? "");
    setRolePerms(r?.permissions ?? []);
    setError(null);
  }
  async function handleSaveRole() {
    setRoleSaving(true);
    setError(null);
    showLoader("Saving role…");
    const result = await saveRole(businessId, {
      id: roleEditId && roleEditId !== "new" ? roleEditId : undefined,
      name: roleName,
      permissions: rolePerms,
    });
    setRoleSaving(false);
    hideLoader();
    if (!result) return setError("Could not save the role. Please refresh the page and try again.");
    if (result.error) return setError(result.error);
    setRoleEditId(null);
    router.refresh();
  }
  async function handleDeleteRole(id: string) {
    showLoader("Deleting role…");
    const result = await deleteRole(businessId, id);
    hideLoader();
    if (result.error) return setError(result.error);
    router.refresh();
  }

  function canEdit(m: BusinessMemberWithEmail) {
    if (!canManage || m.role === "owner" || m.user_id === currentUserId) return false;
    return isOwner || m.role !== "admin";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (atLimit) {
      setShowUpgrade(true);
      return;
    }
    setCreating(true);
    setError(null);
    showLoader("Creating team user…");
    const result = await createTeamUser(businessId, { fullName, username, password, role: effectiveRole, businessIds: multiBiz ? newBizIds : undefined });
    setCreating(false);
    hideLoader();
    if (result.error) {
      if (result.error.includes("Upgrade")) setShowUpgrade(true);
      else setError(result.error);
      return;
    }
    setFullName("");
    setUsername("");
    setPassword("");
    setRole("");
    setNewBizIds([businessId]);
    router.refresh();
  }

  function startEdit(m: BusinessMemberWithEmail) {
    setEditingId(m.user_id);
    setEditName(m.full_name ?? "");
    setEditRole(m.role_id ? `custom:${m.role_id}` : m.role === "admin" || m.role === "manager" ? m.role : "staff");
    setEditPassword("");
    setEditBizIds(m.business_ids?.length ? m.business_ids : [businessId]);
    setError(null);
  }

  async function handleSave(m: BusinessMemberWithEmail) {
    setSaving(true);
    setError(null);
    showLoader("Saving changes…");
    const result = await updateTeamUser(businessId, m.user_id, {
      fullName: m.username ? editName : undefined,
      role: editRole,
      password: editPassword || undefined,
      businessIds: multiBiz ? editBizIds : undefined,
    });
    setSaving(false);
    hideLoader();
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleToggleActive(m: BusinessMemberWithEmail) {
    showLoader(m.is_active ? "Disabling access…" : "Enabling access…");
    const result = await updateTeamUser(businessId, m.user_id, { active: !m.is_active });
    hideLoader();
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const limit = getPlanFeatures(plan).limits.users;
  const atLimit = limit !== null && members.length >= limit;

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    showLoader("Removing team member…");
    const result = await removeTeamUser(businessId, userId);
    setRemovingId(null);
    hideLoader();
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-text">Team</h2>
        <p className="text-sm text-text-soft">
          {limit !== null ? `Users: ${members.length} / ${limit}` : `Users: ${members.length}`}
        </p>
      </div>

      {atLimit && (
        <p className="rounded-lg bg-brass/10 px-3.5 py-2.5 text-sm text-brass-dark">
          {plan === "starter"
            ? "Starter includes 1 user. Upgrade to Professional to add another user."
            : `Your plan includes up to ${limit} users. Upgrade to a higher plan to add more.`}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <div key={m.user_id} className="rounded-xl border border-paper-fold bg-white p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {m.full_name || m.email}
                  {m.user_id === currentUserId && (
                    <span className="ml-1.5 text-xs font-normal text-text-soft">(you)</span>
                  )}
                  {!m.is_active && (
                    <span className="ml-1.5 rounded bg-alert-bg px-1.5 py-0.5 text-xs font-normal text-alert">
                      Disabled
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-text-soft">
                  <span className="capitalize">{m.role_name ?? (m.role === "member" ? "staff" : m.role)}</span>
                  {m.username ? ` · @${m.username}` : ` · ${m.email}`}
                </p>
              </div>
              {canEdit(m) && editingId !== m.user_id && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
                  >
                    Edit
                  </button>
                  {m.username && (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(m)}
                      className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text-soft transition hover:bg-paper"
                    >
                      {m.is_active ? "Disable" : "Enable"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={removingId === m.user_id}
                    onClick={() => handleRemove(m.user_id)}
                    className="rounded-lg border border-alert/30 px-3 py-1.5 text-xs font-semibold text-alert transition hover:bg-alert-bg disabled:opacity-60"
                  >
                    {removingId === m.user_id ? "Removing…" : "Remove"}
                  </button>
                </div>
              )}
            </div>

            {editingId === m.user_id && (
              <div className="mt-3 grid gap-3 border-t border-paper-fold pt-3 sm:grid-cols-2">
                {m.username && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text">Name</span>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(lettersOnly(e.target.value))}
                      className="rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink"
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text">Role</span>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink"
                  >
                    {editOptions.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                {m.username && (
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs font-medium text-text">New password (leave blank to keep)</span>
                    <div className="relative">
                      <input
                        type={showEditPw ? "text" : "password"}
                        autoComplete="new-password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full rounded-xl border border-paper-fold bg-white py-2 pl-3 pr-10 text-sm text-text focus:border-ink"
                      />
                      <EyeToggle shown={showEditPw} onToggle={() => setShowEditPw((v) => !v)} />
                    </div>
                  </label>
                )}
                {multiBiz && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-xs font-medium text-text">Businesses this user can open</span>
                    <div className="flex flex-wrap gap-2">
                      {ownerBusinesses.map((b) => (
                        <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-paper-fold px-3 py-1.5 text-sm text-text">
                          <input
                            type="checkbox"
                            checked={editBizIds.includes(b.id)}
                            onChange={() => setEditBizIds((cur) => toggle(cur, b.id))}
                            className="h-4 w-4 accent-[#1f3a2d]"
                          />
                          {b.business_name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave(m)}
                    className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-paper-fold px-4 py-2 text-xs font-semibold text-text-soft"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="flex flex-col gap-3 rounded-xl border border-paper-fold bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text">Roles &amp; access</p>
              <p className="text-xs text-text-soft">
                Create a role and tick what it can open. Owner and Admin always have full access.
              </p>
            </div>
            {roleEditId === null && (
              <button
                type="button"
                onClick={() => openRole(null)}
                className="shrink-0 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper hover:bg-ink-light"
              >
                + New role
              </button>
            )}
          </div>

          {roleEditId === null &&
            (roles.length === 0 ? (
              <p className="text-xs text-text-soft">
                No roles yet. Click "+ New role" to make one, then assign it to a user. (Admin always has full access.)
              </p>
            ) : (
              roles.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{r.name}</p>
                    <p className="text-xs text-text-soft">{r.permissions.filter((k) => !k.includes(":view")).length} areas ticked</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => openRole(r)} className="rounded-lg border border-paper-fold bg-white px-3 py-1.5 text-xs font-semibold text-text">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteRole(r.id)} className="rounded-lg border border-alert/30 bg-white px-3 py-1.5 text-xs font-semibold text-alert">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ))}

          {roleEditId !== null && (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text">Role name</span>
                <input
                  value={roleName}
                  onChange={(e) => setRoleName(lettersOnly(e.target.value))}
                  placeholder="Cashier"
                  className="rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {PERMISSIONS.map((p) => {
                  const on = rolePerms.includes(p.key);
                  return (
                    <label key={p.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-paper-fold px-3 py-2 text-sm text-text">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setRolePerms((cur) => (on ? cur.filter((k) => k !== p.key) : [...cur, p.key]))}
                        className="h-4 w-4 accent-[#1f3a2d]"
                      />
                      {p.label}
                    </label>
                  );
                })}
              </div>
              <div className="rounded-lg border border-paper-fold">
                <p className="border-b border-paper-fold bg-paper px-3 py-2 text-xs font-semibold text-text">
                  Settings sections
                </p>
                {SETTINGS_SECTIONS.map((sec) => {
                  const v = rolePerms.includes(`settings.${sec.key}:view`);
                  const e = rolePerms.includes(`settings.${sec.key}:edit`);
                  return (
                    <div key={sec.key} className="flex items-center justify-between gap-3 border-b border-paper-fold px-3 py-2 text-sm last:border-b-0">
                      <span className="text-text">{sec.label}</span>
                      <span className="flex gap-4">
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-soft">
                          <input
                            type="checkbox"
                            checked={v || e}
                            onChange={() =>
                              setRolePerms((cur) =>
                                v || e
                                  ? cur.filter((k) => k !== `settings.${sec.key}:view` && k !== `settings.${sec.key}:edit`)
                                  : [...cur, `settings.${sec.key}:view`]
                              )
                            }
                            className="h-4 w-4 accent-[#1f3a2d]"
                          />
                          View
                        </label>
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-soft">
                          <input
                            type="checkbox"
                            checked={e}
                            onChange={() =>
                              setRolePerms((cur) =>
                                e
                                  ? cur.filter((k) => k !== `settings.${sec.key}:edit`)
                                  : Array.from(new Set([...cur, `settings.${sec.key}:view`, `settings.${sec.key}:edit`]))
                              )
                            }
                            className="h-4 w-4 accent-[#1f3a2d]"
                          />
                          Edit
                        </label>
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-text-soft">
                Everyone can always change their own password under Settings → Security.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={roleSaving || !roleName.trim()}
                  onClick={handleSaveRole}
                  className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-ink-light disabled:opacity-60"
                >
                  {roleSaving ? "Saving…" : "Save role"}
                </button>
                <button type="button" onClick={() => setRoleEditId(null)} className="rounded-lg border border-paper-fold px-4 py-2 text-xs font-semibold text-text-soft">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canManage && (
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-xl border border-paper-fold bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-text">Create a team login</p>
            <p className="text-xs text-text-soft">
              They sign in with this username and password — no email needed.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text">Name</span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(lettersOnly(e.target.value))}
                placeholder="Ravi Kumar"
                className="rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text">Username</span>
              <input
                required
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="ravi.kumar"
                className="rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text">Password</span>
              <div className="relative">
                <input
                  required
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ chars, capital letter, symbol"
                  className="w-full rounded-xl border border-paper-fold bg-white py-2 pl-3 pr-10 text-sm text-text focus:border-ink"
                />
                <EyeToggle shown={showPw} onToggle={() => setShowPw((v) => !v)} />
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text">Role</span>
              <select
                value={effectiveRole}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink"
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
                {multiBiz && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-xs font-medium text-text">Businesses this user can open</span>
                    <div className="flex flex-wrap gap-2">
                      {ownerBusinesses.map((b) => (
                        <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-paper-fold px-3 py-1.5 text-sm text-text">
                          <input
                            type="checkbox"
                            checked={newBizIds.includes(b.id)}
                            onChange={() => setNewBizIds((cur) => toggle(cur, b.id))}
                            className="h-4 w-4 accent-[#1f3a2d]"
                          />
                          {b.business_name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
          </div>
          <button
            type="submit"
            disabled={creating || !fullName.trim() || !username.trim() || !password || !effectiveRole}
            className="self-start rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create user"}
          </button>
        </form>
      )}

      {!canManage && (
        <p className="text-sm text-text-soft">Only the business owner or an admin can manage team members.</p>
      )}

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      {showUpgrade && (
        <PlanComparisonModal currentPlan={plan} onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}
