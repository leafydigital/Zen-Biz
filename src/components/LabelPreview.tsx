"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { barcodeSvg, labelLayout, paperSize, type BarcodeSettings, type LabelItem } from "@/lib/barcode";

const MM = 3.78; // CSS px per mm at 100%
const PT = 96 / 72; // CSS px per point

/**
 * Draws the label paper at its real size (mm, pt) and then shrinks the whole
 * drawing to fit the screen, so nothing overlaps or spills out on a phone and
 * the proportions are exactly those of the printed label.
 */
export function LabelPreview({
  settings: s,
  item,
  businessName,
  rows,
}: {
  settings: BarcodeSettings;
  item: LabelItem;
  businessName: string;
  /** How many label rows to show (defaults to 2 on a roll, 3 on a sheet). */
  rows?: number;
}) {
  const paper = paperSize(s);
  const showRows = rows ?? (s.paperType === "sheet" ? 3 : 2);
  const { pad, lineH, barH, barW } = labelLayout(s);
  const svg = useMemo(() => {
    try {
      return barcodeSvg(item.code, s);
    } catch {
      return "";
    }
  }, [item.code, s]);

  const hostRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(300);
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => setAvail(el.clientWidth || 300);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibleMm = s.paperType === "sheet" ? s.marginY + showRows * (s.labelHeight + s.gapY) : paper.height * showRows;
  const naturalW = paper.width * MM;
  const naturalH = visibleMm * MM;
  const k = Math.min(1.6, avail / naturalW);
  const px = (mm: number) => mm * MM;

  const line = (text: string, bold = false) => (
    <div
      style={{
        height: px(lineH),
        lineHeight: `${px(lineH)}px`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontWeight: bold ? 700 : 400,
      }}
    >
      {text}
    </div>
  );

  const cells = [];
  for (let r = 0; r < showRows; r++) {
    for (let c = 0; c < s.columns; c++) {
      const left = s.marginX + c * (s.labelWidth + s.gapX);
      const top = (s.paperType === "sheet" ? s.marginY : 0) + r * (s.labelHeight + s.gapY);
      cells.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: "absolute",
            boxSizing: "border-box",
            left: px(left),
            top: px(top),
            width: px(s.labelWidth),
            height: px(s.labelHeight),
            padding: px(pad),
            overflow: "hidden",
            background: "#fff",
            border: "1px dashed #9ca3af",
            textAlign: s.align,
            fontSize: s.fontSize * PT,
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#000",
          }}
        >
          {s.showBusiness && businessName && line(businessName, true)}
          {s.showName && line(item.name)}
          <div
            style={{
              height: px(barH),
              width: px(barW),
              margin: `${px(0.3)}px ${s.align === "center" ? "auto" : "0"}`,
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {s.showCode && line(item.code)}
          {s.showPrice && item.price != null && line(`Rs. ${item.price}`, true)}
        </div>
      );
    }
  }

  return (
    <div ref={hostRef} className="w-full">
      <div className="overflow-hidden rounded border border-gray-300 bg-gray-100" style={{ width: naturalW * k, height: naturalH * k }}>
        <div
          style={{
            position: "relative",
            width: naturalW,
            height: naturalH,
            transform: `scale(${k})`,
            transformOrigin: "top left",
          }}
        >
          {cells}
        </div>
      </div>
      <p className="mt-2 text-xs text-text-soft">
        Paper {Math.round(paper.width * 10) / 10} mm wide · each label {s.labelWidth} × {s.labelHeight} mm · {s.columns}{" "}
        {s.columns === 1 ? "column" : "columns"}
      </p>
    </div>
  );
}
