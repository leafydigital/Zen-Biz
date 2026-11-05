import { ImageResponse } from "next/og";

export const alt = "Zen Biz — billing, GST invoice and barcode stock software";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card shown when the site is linked on WhatsApp, Facebook, LinkedIn, X and similar. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0F3D3E 0%, #155356 60%, #2563EB 140%)",
          color: "#F7F5F0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            Z
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Zen Biz</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>
            Billing, GST invoices and barcode stock for small business
          </div>
          <div style={{ fontSize: 30, color: "#DDBE5A", display: "flex" }}>
            Scan with your phone · Print labels · Works offline · Free to start
          </div>
        </div>
      </div>
    ),
    size
  );
}
