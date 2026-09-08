/**
 * Country calling codes for the signup phone field's dropdown. India is
 * listed first and used as the default, per product requirement — the
 * rest are ordered by rough global usage relevance, not alphabetically,
 * so common ones aren't buried. Not an exhaustive ISO list (that would
 * be 190+ entries for a dropdown most users will never touch) — covers
 * every country a Zen Biz user is realistically likely to be in.
 */
export interface CountryCode {
  name: string;
  dialCode: string;
  /** ISO 3166-1 alpha-2, used only as a stable React key. */
  iso: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { name: "India", dialCode: "+91", iso: "IN" },
  { name: "United States", dialCode: "+1", iso: "US" },
  { name: "United Kingdom", dialCode: "+44", iso: "GB" },
  { name: "United Arab Emirates", dialCode: "+971", iso: "AE" },
  { name: "Saudi Arabia", dialCode: "+966", iso: "SA" },
  { name: "Canada", dialCode: "+1", iso: "CA" },
  { name: "Australia", dialCode: "+61", iso: "AU" },
  { name: "Singapore", dialCode: "+65", iso: "SG" },
  { name: "Nepal", dialCode: "+977", iso: "NP" },
  { name: "Bangladesh", dialCode: "+880", iso: "BD" },
  { name: "Sri Lanka", dialCode: "+94", iso: "LK" },
  { name: "Pakistan", dialCode: "+92", iso: "PK" },
  { name: "Qatar", dialCode: "+974", iso: "QA" },
  { name: "Kuwait", dialCode: "+965", iso: "KW" },
  { name: "Oman", dialCode: "+968", iso: "OM" },
  { name: "Bahrain", dialCode: "+973", iso: "BH" },
  { name: "Malaysia", dialCode: "+60", iso: "MY" },
  { name: "Germany", dialCode: "+49", iso: "DE" },
  { name: "France", dialCode: "+33", iso: "FR" },
  { name: "South Africa", dialCode: "+27", iso: "ZA" },
  { name: "New Zealand", dialCode: "+64", iso: "NZ" },
];

export const DEFAULT_COUNTRY: CountryCode = COUNTRY_CODES[0]; // India
