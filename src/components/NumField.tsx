"use client";

import { useEffect, useState } from "react";

/** Number box that shows empty (not "0") when the value is 0 and never keeps a leading zero. */
export function NumField({
  value,
  onValue,
  max,
  className,
  placeholder,
  ...rest
}: {
  value: number;
  onValue: (n: number) => void;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(value ? String(value) : "");

  useEffect(() => {
    if ((parseFloat(text) || 0) !== value) setText(value ? String(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={rest["aria-label"]}
      placeholder={placeholder ?? "0"}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        let v = e.target.value.replace(/[^0-9.]/g, "");
        const dot = v.indexOf(".");
        if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
        v = v.replace(/^0+(?=\d)/, "");
        let n = parseFloat(v) || 0;
        if (max !== undefined && n > Number(max)) {
          n = Number(max);
          v = String(n);
        }
        setText(v);
        onValue(n);
      }}
      className={className}
    />
  );
}
