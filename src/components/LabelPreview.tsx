"use client";

import { useMemo } from "react";
import { barcodeSvg, labelLayout, paperSize, type BarcodeSettings, type LabelItem } from "@/lib/barcode";

const MM_TO_PX = 3.78;

/** Draws the label paper to scale, so what you see is the layout that prints. */
export function LabelPreview({
  settings: s,
  item,
  businessName,
  maxWidthPx = 460,
  rows,
}: {
  settings: BarcodeSettings;
  item: LabelItem;
  businessName: string;
  maxWidthPx?: number;
  /** How many label rows to show (defaults to 2 on a roll, 3 on a sheet). */
  rows?: number;
}) {
  const paper = paperSize(s);
  const showRows = rows ?? (s.paperType === "sheet" ? 3 : 2);
  const { pad, lineH, barH } = labelLayout(s);
  const svg = useMemo(() => {
    try {
      return barcodeSvg(item.code, s);
    } catch {
      return "";
    }
  }, [item.code, s]);

  const visibleH = s.paperType === "sheet" ? s.marginY + showRows * (s.labelHeight + s.gapY) : paper.height * showRows;
  const scale = Math.min(MM_TO_PX, maxWidthPx / paper.width);
  const px = (mm: number) => mm * scale;
  const fontPx = s.fontSize * 0.3528 * scale;

  const cells = [];
  for (let r = 0; r < showRows; r++) {
    for (let c = 0; c < s.columns; c++) {
      const left = s.marginX + c * (s.labelWidth + s.gapX);
      const top = (s.paperType === "sheet" ? s.marginY : 0) + r * (s.labelHeight + s.gapY);
      cells.push(
        <div
          key={`${r}-${c}`}
          className="absolute overflow-hidden border border-dashed border-gray-400 bg-white"
          style={{
            left: px(left),
            top: px(top),
            width: px(s.labelWidth),
            height: px(s.labelHeight),
            padding: px(pad),
            fontSize: fontPx,
            lineHeight: `${px(lineH)}px`,
            textAlign: s.align,
            color: "#000",
          }}
        >
          {s.showBusiness && businessName && <div className="truncate font-bold">{businessName}</div>}
          {s.showName && <div className="truncate">{item.name}</div>}
          <div
            style={{
              height: px(barH),
              margin: s.align === "center" ? "0 auto" : undefined,
              width: "92%",
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {s.showCode && <div className="truncate">{item.code}</div>}
          {s.showPrice && item.price != null && <div className="truncate font-bold">Rs. {item.price}</div>}
        </div>
      );
    }
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="relative rounded border border-gray-300 bg-gray-100 shadow-inner"
        style={{ width: px(paper.width), height: px(visibleH) }}
      >
        {cells}
      </div>
      <p className="mt-2 text-xs text-text-soft">
        Paper {Math.round(paper.width * 10) / 10} mm wide · each label {s.labelWidth} × {s.labelHeight} mm · {s.columns}{" "}
        {s.columns === 1 ? "column" : "columns"}
      </p>
    </div>
  );
}
