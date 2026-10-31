"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getUserBusinesses, ACTIVE_BUSINESS_COOKIE } from "@/lib/getActiveBusiness";
import { getPlanFeatures } from "@/lib/planFeatures";

/**
 * Switches which business subsequent requests operate on, by setting the
 * cookie getActiveBusiness() reads. Verifies membership itself before
 * writing the cookie — belt-and-braces alongside RLS, so a request for a
 * business_id the user doesn't belong to never even gets remembered as
 * "active", let alone reaches a query.
 */
export async function switchActiveBusiness(businessId: string) {
  const businesses = await getUserBusinesses();
  const isMember = businesses.some((b) => b.id === businessId);
  if (!isMember) {
    return { error: "You don't have access to that business." };
  }

  cookies().set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/**
 * Creates a new business owned by the current user, after checking the
 * plan's business limit — the actual enforcement point, not just a UI
 * disable. The limit is per subscriber (profiles.plan), since a
 * Professional-plan person can have up to 2 businesses regardless of how
 * many people are members of each.
 */
export async function createBusiness(input: {
  business_name: string;
  business_type?: string;
  address?: string | null;
  state?: string | null;
  gst_number?: string | null;
  phone?: string | null;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", business: null };

  const [profile, businesses] = await Promise.all([getCurrentProfile(), getUserBusinesses()]);
  const limit = getPlanFeatures(profile?.plan ?? "starter").limits.businesses;

  if (limit !== null && businesses.length >= limit) {
    const nextPlan = profile?.plan === "professional" ? "Business" : "Professional";
    const nextLimit = profile?.plan === "professional" ? 5 : 2;
    return {
      error:
        profile?.plan === "starter"
          ? "You've reached the 1-business limit on Starter. Upgrade to Professional to manage up to 2 businesses."
          : `${profile?.plan === "professional" ? "Professional" : "Your plan"} allows up to ${limit} businesses. Upgrade to ${nextPlan} to manage up to ${nextLimit} businesses.`,
      business: null,
    };
  }

  const { data: business, error: insertErr } = await supabase
    .from("businesses" as never)
    .insert({
      owner_id: user.id,
      business_name: input.business_name.trim(),
      business_type: input.business_type?.trim() || "",
      address: input.address?.trim() || null,
      state: input.state || null,
      gst_number: input.gst_number?.trim() || null,
      phone: input.phone?.trim() || null,
    } as never)
    .select()
    .single();

  if (insertErr || !business) {
    return { error: insertErr?.message ?? "Could not create the business.", business: null };
  }

  const businessId = (business as { id: string }).id;
  const { error: memberErr } = await supabase
    .from("business_members" as never)
    .insert({ business_id: businessId, user_id: user.id, role: "owner" } as never);

  if (memberErr) {
    // Roll back the orphaned business row rather than leaving a business
    // with no membership link behind — that exact state (a real business
    // with nobody able to see it, since RLS requires membership) is what
    // repeatedly caused the "already created a business but the app
    // won't recognize it" problem. Failing loudly and cleanly here is
    // safer than silently leaving a broken row for a self-heal to find
    // later.
    await supabase.from("businesses" as never).delete().eq("id", businessId);
    return {
      error: `Could not finish setting up the business (${memberErr.message}). Nothing was created — please try again.`,
      business: null,
    };
  }

  // Verify the membership row actually exists before declaring success —
  // insert() can return no error in edge cases (e.g. a policy silently
  // filtering the row) while still not leaving a row behind. This is the
  // single check that would have caught every instance of "business
  // created but not recognized" in this app so far, rather than trusting
  // the absence of an error alone.
  const { count: verifyCount } = await supabase
    .from("business_members" as never)
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("user_id", user.id);

  if (!verifyCount || verifyCount === 0) {
    await supabase.from("businesses" as never).delete().eq("id", businessId);
    return {
      error: "Something went wrong linking your account to the new business. Nothing was created — please try again.",
      business: null,
    };
  }

  revalidatePath("/dashboard", "layout");
  return { error: null, business };
}

/** Adds an existing user or invites a new email address as a business member. */
export async function addBusinessMember(businessId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(normalizedEmail)
  ) {
    return { error: "Enter a valid email address." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: business } = (await supabase
    .from("businesses" as never)
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle()) as { data: { owner_id: string } | null };

  if (!business || business.owner_id !== user.id) {
    return { error: "Only the business owner can add team members." };
  }

  const [profile, { count: memberCount }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("business_members" as never)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
  ]);

  const userLimit = getPlanFeatures(profile?.plan ?? "starter").limits.users;
  if (userLimit !== null && (memberCount ?? 0) >= userLimit) {
    const message =
      profile?.plan === "starter"
        ? "Starter includes 1 user. Upgrade to Professional to add another user."
        : `Your plan includes up to ${userLimit} users. Upgrade to a higher plan to add more.`;
    return { error: message };
  }

  const { data: invitedUser } = (await supabase.rpc("get_user_id_by_email" as never, {
    lookup_email: normalizedEmail,
  } as never)) as { data: string | null };

  let memberUserId = invitedUser;
  let inviteSent = false;

  if (!memberUserId) {
    try {
      const admin = createAdminClient();
      const requestOrigin = headers().get("origin");
      const siteOrigin = requestOrigin?.startsWith("https://") || requestOrigin?.startsWith("http://")
        ? requestOrigin
        : "https://zenbiz.app";
      const { data, error } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: new URL("/reset-password", siteOrigin).toString(),
      });

      if (error) return { error: error.message };
      if (!data.user) return { error: "The invitation could not be created. Please try again." };

      memberUserId = data.user.id;
      const { error: profileError } = await admin
        .from("profiles" as never)
        .update({ onboarding_complete: true } as never)
        .eq("id", memberUserId);

      if (profileError) {
        return { error: "The invitation was sent, but the account could not be prepared. Please contact support." };
      }

      const { error: insertError } = await admin
        .from("business_members" as never)
        .insert({ business_id: businessId, user_id: memberUserId, role: "member" } as never);

      if (insertError) {
        if (insertError.message.includes("duplicate")) {
          return { error: "That person is already a member of this business." };
        }
        return { error: "The invitation was sent, but the team membership could not be added. Please try again." };
      }

      inviteSent = true;
    } catch {
      return { error: "Unable to send the invitation. Please try again or contact support." };
    }
  } else {
    const { error: insertError } = await supabase
      .from("business_members" as never)
      .insert({ business_id: businessId, user_id: memberUserId, role: "member" } as never);

    if (insertError) {
      if (insertError.message.includes("duplicate")) {
        return { error: "That person is already a member of this business." };
      }
      return { error: insertError.message };
    }
  }

  revalidatePath("/dashboard/settings");
  return { error: null, inviteSent };
}

/**
 * Removes a member from a business. Only the owner can do this, and the
 * owner can never remove themselves this way (a business must always keep
 * its owner as a member).
 */
export async function removeBusinessMember(businessId: string, userId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: business } = (await supabase
    .from("businesses" as never)
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle()) as { data: { owner_id: string } | null };

  if (!business || business.owner_id !== user.id) {
    return { error: "Only the business owner can remove team members." };
  }
  if (userId === business.owner_id) {
    return { error: "The business owner can't be removed." };
  }

  const { error } = await supabase
    .from("business_members" as never)
    .delete()
    .eq("business_id", businessId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { error: null };
}
