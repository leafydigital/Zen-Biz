"use server";

import { cookies } from "next/headers";
import { PERIOD_COOKIE, parsePeriod } from "@/lib/period";

export async function setPeriod(value: string) {
  const p = parsePeriod(value);
  cookies().set(PERIOD_COOKIE, p.value, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return { value: p.value };
}
