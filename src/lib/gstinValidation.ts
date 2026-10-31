/**
 * Validates a GSTIN's structure and checksum digit — this confirms the
 * number is well-formed according to India's official GSTIN format
 * rules, catching typos and malformed entries immediately, with no
 * external API call needed. It does NOT confirm the GSTIN is actually
 * registered, active, or belongs to a real business — that requires a
 * live lookup against India's GST database via a third-party GSP
 * provider (see verifyGstin() below for where that would plug in).
 *
 * Format: 15 characters —
 *   [0-1]  2-digit state code (01-38, plus a few special codes)
 *   [2-11] 10-character PAN (5 letters, 4 digits, 1 letter)
 *   [12]   entity/registration number for this PAN in this state (1-9, A-Z)
 *   [13]   fixed literal "Z"
 *   [14]   checksum character, computed from the other 14
 */

const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// The character set GSTIN checksums are computed over, in order —
// digits 0-9 then letters A-Z, each assigned a value equal to its
// position in this string (this is the specific alphabet India's GSTIN
// check-digit algorithm uses).
const CHECKSUM_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function computeCheckDigit(gstinWithoutCheckDigit: string): string {
  let factor = 2;
  let sum = 0;
  const charsetLength = CHECKSUM_CHARSET.length;

  for (let i = gstinWithoutCheckDigit.length - 1; i >= 0; i--) {
    const codePoint = CHECKSUM_CHARSET.indexOf(gstinWithoutCheckDigit[i]);
    let digit = factor * codePoint;
    digit = Math.floor(digit / charsetLength) + (digit % charsetLength);
    sum += digit;
    factor = factor === 2 ? 1 : 2;
  }

  const checkCodePoint = (charsetLength - (sum % charsetLength)) % charsetLength;
  return CHECKSUM_CHARSET[checkCodePoint];
}

export interface GstinValidationResult {
  valid: boolean;
  /** A short reason when invalid, safe to show directly to the user. */
  reason?: string;
  /** The 2-digit state code, when the format is at least well-shaped
   * enough to extract one — useful for a "this looks like a <State>
   * GSTIN" hint even before full validation completes. */
  stateCode?: string;
}

const STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi",
  "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
  "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam",
  "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
  "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh",
};

/**
 * Checks structure and checksum only — see the module docstring above
 * for exactly what this does and doesn't confirm.
 */
export function validateGstinFormat(rawGstin: string): GstinValidationResult {
  const gstin = rawGstin.trim().toUpperCase();

  if (gstin.length === 0) {
    return { valid: false, reason: "GSTIN is required." };
  }
  if (gstin.length !== 15) {
    return { valid: false, reason: "A GSTIN must be exactly 15 characters." };
  }
  if (!GSTIN_SHAPE.test(gstin)) {
    return {
      valid: false,
      reason: "That doesn't match a valid GSTIN format (e.g. 27AAAPL1234C1Z5).",
    };
  }

  const stateCode = gstin.slice(0, 2);
  if (!STATE_CODES[stateCode]) {
    return { valid: false, reason: "That doesn't start with a recognized state code.", stateCode };
  }

  const expectedCheckDigit = computeCheckDigit(gstin.slice(0, 14));
  if (expectedCheckDigit !== gstin[14]) {
    return {
      valid: false,
      reason: "The GSTIN's check digit doesn't match — please re-check for a typo.",
      stateCode,
    };
  }

  return { valid: true, stateCode };
}

export function stateNameForCode(stateCode: string): string | null {
  return STATE_CODES[stateCode] ?? null;
}

export interface GstinLookupResult {
  legalName: string;
  tradeName: string | null;
  status: string;
  address: string | null;
}

/**
 * Looks up the real, registered business name and status for a GSTIN by
 * calling a third-party GSP (GST Suvidha Provider) API — this is NOT
 * implemented yet, since every real provider (gstinapi.in, AppyFlow,
 * Masters India, KnowYourGST, etc.) requires signing up for their own
 * account and API key, the same way Brevo/Twilio did earlier for email
 * and SMS. There is no way to query India's official GST database
 * directly from this app's own code — Zen Biz has no special access to
 * it, and no provider offers this without a real account.
 *
 * To wire up a real provider once you've chosen and signed up for one:
 *   1. Add its API key as an environment variable (never hardcode it
 *      here — it would be visible to anyone using the app).
 *   2. This needs to run server-side (a Server Action or API route),
 *      not directly from this client component, so the API key is
 *      never exposed to the browser.
 *   3. Replace the body below with a real fetch() to that provider's
 *      endpoint, using their exact request/response shape.
 *
 * Until then, this always throws — callers should catch that and fall
 * back to the format-only check above (validateGstinFormat), which
 * needs no external account and works today.
 */
export async function lookupGstinDetails(_gstin: string): Promise<GstinLookupResult> {
  throw new Error(
    "Real GSTIN lookup isn't connected yet — this needs a GSP provider account (e.g. gstinapi.in, AppyFlow) and its API key configured server-side first."
  );
}
