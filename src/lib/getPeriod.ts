import { cookies } from "next/headers";
import { PERIOD_COOKIE, parsePeriod, type Period } from "@/lib/period";

/** The period chosen in the header switcher (server side). */
export function getPeriod(): Period {
  return parsePeriod(cookies().get(PERIOD_COOKIE)?.value);
}
