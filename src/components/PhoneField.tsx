"use client";

import { COUNTRY_CODES } from "@/lib/countryCodes";

/** Country-code dropdown + a number box that only takes digits, max 10. */
export function PhoneField({
  dial,
  onDial,
  digits,
  onDigits,
  required,
}: {
  dial: string;
  onDial: (v: string) => void;
  digits: string;
  onDigits: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <select
        value={dial}
        onChange={(e) => onDial(e.target.value)}
        aria-label="Country code"
        className="w-[110px] shrink-0 rounded-xl border border-paper-fold bg-white px-2.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.iso} value={c.dialCode}>
            {c.dialCode} {c.iso}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        required={required}
        autoComplete="tel-national"
        maxLength={10}
        value={digits}
        onChange={(e) => onDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
        placeholder="10-digit number"
        className="min-w-0 flex-1 rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
      />
    </div>
  );
}
