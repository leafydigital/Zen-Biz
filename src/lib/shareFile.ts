// Open exactly once. (Passing "noopener" makes window.open return null even when
// it worked, which used to trigger a second navigation and a duplicated message.)
function openUrl(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Phone: shares the PDF file itself (pick WhatsApp). Computer: downloads the PDF
 * and opens WhatsApp with the number and message (no link) — a website cannot
 * attach a file to WhatsApp Web, so the PDF is dragged into the chat.
 */
export async function sharePdfToWhatsApp({
  blob,
  filename,
  text,
  fallbackText,
  phone,
  businessId,
}: {
  blob: Blob;
  filename: string;
  text: string;
  fallbackText: string;
  phone?: string | null;
  businessId: string;
}): Promise<"file" | "fallback"> {
  const digits = phone ? phone.replace(/[^0-9]/g, "") : "";

  // Phones, Windows and Mac (Chrome/Edge/Safari): hand the real PDF file to the device's share menu,
  // where WhatsApp attaches it. Browsers without file sharing fall through to download + chat.
  {
    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text });
        return "file";
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return "file";
    }
  }

  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  openUrl(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`);
  return "fallback";
}
