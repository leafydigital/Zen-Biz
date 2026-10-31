"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";
import type { SupportTicketType } from "@/types/database";

export function ContactUsForm({
  userId,
  businessId,
  defaultName,
  defaultEmail,
}: {
  userId: string;
  businessId: string | null;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [ticketType, setTicketType] = useState<SupportTicketType | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-xl2 border border-paper-fold bg-white p-6 text-center">
        <p className="text-sm font-semibold text-text">Thanks — we've got your message.</p>
        <p className="mt-1 text-sm text-text-soft">
          We'll get back to you at the email or WhatsApp number you provided.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setTicketType(null);
          }}
          className="mt-4 rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
        >
          Send another message
        </button>
      </div>
    );
  }

  if (!ticketType) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setTicketType("info")}
          className="flex-1 rounded-xl2 border border-paper-fold bg-white p-5 text-left transition hover:border-ink/40 hover:shadow-card"
        >
          <p className="text-sm font-semibold text-text">Know more details</p>
          <p className="mt-1 text-xs text-text-soft">
            Ask a question about Zen Biz, pricing, or a feature.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTicketType("issue")}
          className="flex-1 rounded-xl2 border border-paper-fold bg-white p-5 text-left transition hover:border-ink/40 hover:shadow-card"
        >
          <p className="text-sm font-semibold text-text">Report an issue</p>
          <p className="mt-1 text-xs text-text-soft">
            Something not working right? Tell us what happened — you can attach a screenshot.
          </p>
        </button>
      </div>
    );
  }

  return (
    <TicketForm
      ticketType={ticketType}
      userId={userId}
      businessId={businessId}
      defaultName={defaultName}
      defaultEmail={defaultEmail}
      onBack={() => setTicketType(null)}
      onSubmitted={() => setSubmitted(true)}
    />
  );
}

function TicketForm({
  ticketType,
  userId,
  businessId,
  defaultName,
  defaultEmail,
  onBack,
  onSubmitted,
}: {
  ticketType: SupportTicketType;
  userId: string;
  businessId: string | null;
  defaultName?: string;
  defaultEmail?: string;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const supabase = createClient();
  const { showLoader, hideLoader } = useGlobalLoader();

  const [name, setName] = useState(defaultName ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Name, email, and message are required.");
      return;
    }

    setSaving(true);
    setError(null);
    showLoader("Sending your message…");

    function stopLoading() {
      setSaving(false);
      hideLoader();
    }

    let screenshotUrl: string | null = null;
    if (screenshotFile) {
      const ext = screenshotFile.name.split(".").pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("ticket-screenshots")
        .upload(path, screenshotFile);
      if (uploadErr) {
        stopLoading();
        setError(`Couldn't upload the screenshot (${uploadErr.message}). You can try again, or submit without it.`);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("ticket-screenshots").getPublicUrl(path);
      screenshotUrl = publicUrlData.publicUrl;
    }

    const { error: insertErr } = await supabase.from("support_tickets" as never).insert({
      user_id: userId,
      business_id: businessId,
      ticket_type: ticketType,
      name: name.trim(),
      whatsapp_number: whatsappNumber.trim() || null,
      email: email.trim(),
      address: address.trim() || null,
      pincode: pincode.trim() || null,
      notes: notes.trim() || null,
      message: message.trim(),
      screenshot_url: screenshotUrl,
    } as never);

    stopLoading();

    if (insertErr) {
      setError(insertErr.message || "Something went wrong sending your message. Please try again.");
      return;
    }

    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm font-medium text-text-soft hover:text-ink"
      >
        ← Back
      </button>

      <p className="text-sm font-semibold text-text">
        {ticketType === "info" ? "Know more details" : "Report an issue"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">WhatsApp number</span>
          <input
            type="tel"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="98765 43210"
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Gmail / Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Pincode</span>
          <input
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Address</span>
        <textarea
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Notes</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else worth knowing"
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Message</span>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            ticketType === "info"
              ? "What would you like to know?"
              : "What happened? What did you expect instead?"
          }
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
        />
      </label>

      {ticketType === "issue" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">
            Screenshot <span className="text-text-soft">(optional)</span>
          </span>
          <input type="file" accept="image/*" onChange={handleScreenshotChange} className="text-sm" />
          {screenshotPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={screenshotPreview} alt="" className="mt-1 max-h-40 rounded-lg border border-paper-fold" />
          )}
        </label>
      )}

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {saving ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
