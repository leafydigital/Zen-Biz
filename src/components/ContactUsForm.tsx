"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";
import { PhoneField } from "@/components/PhoneField";
import { sendTicketOtp, submitSupportTicket, verifyTicketOtp } from "@/lib/actions/otpActions";
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
  const [ticketNo, setTicketNo] = useState<string | null>(null);

  if (submitted) {
    return (
      <div className="rounded-xl2 border border-paper-fold bg-white p-6 text-center">
        <p className="text-sm font-semibold text-text">Thanks — we've got your message.</p>
        {ticketNo && (
          <p className="mt-3 text-sm text-text-soft">
            Your ticket number
            <span className="mt-1 block font-ledger text-2xl font-bold tracking-wide text-ink">{ticketNo}</span>
            <span className="text-xs">Keep it for reference — you can follow its status below.</span>
          </p>
        )}
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
      onSubmitted={(no) => {
        setTicketNo(no ?? null);
        setSubmitted(true);
      }}
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
  onSubmitted: (ticketNo?: string) => void;
}) {
  const supabase = createClient();
  const { showLoader, hideLoader } = useGlobalLoader();

  const [name, setName] = useState(defaultName ?? "");
  const [phoneDial, setPhoneDial] = useState("+91");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [waDial, setWaDial] = useState("+91");
  const [waDigits, setWaDigits] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const emailVerified = verifiedEmail !== null && verifiedEmail === email.trim().toLowerCase();

  async function sendCode() {
    if (!/^[^\s@]+@gmail\.com$/i.test(email.trim())) {
      setOtpMsg("Please use a Gmail address ending in @gmail.com.");
      return;
    }
    setOtpBusy(true);
    setOtpMsg(null);
    const r = await sendTicketOtp(email);
    setOtpBusy(false);
    if (r.error) return setOtpMsg(r.error);
    setOtpSent(true);
    setOtpMsg(`We sent a 6-digit code to ${email.trim()}.`);
  }

  async function checkCode() {
    setOtpBusy(true);
    const r = await verifyTicketOtp(email, otpCode);
    setOtpBusy(false);
    if (r.error || !r.token) return setOtpMsg(r.error ?? "Could not verify.");
    setVerifiedEmail(email.trim().toLowerCase());
    setVerifyToken(r.token);
    setOtpMsg(null);
  }

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
    if (!/^\d{10}$/.test(phoneDigits)) {
      setError("Please enter a 10-digit phone number.");
      return;
    }
    if (!sameWhatsapp && !/^\d{10}$/.test(waDigits)) {
      setError("Please enter a 10-digit WhatsApp number.");
      return;
    }
    if (!emailVerified) {
      setError("Please verify your email with the code first.");
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

    const { error: insertErr, ticketNo: newNo } = await submitSupportTicket({
      businessId,
      ticketType,
      name,
      phone: `${phoneDial}${phoneDigits}`,
      whatsappNumber: sameWhatsapp ? `${phoneDial}${phoneDigits}` : `${waDial}${waDigits}`,
      email,
      address,
      pincode,
      notes,
      message,
      screenshotUrl,
      verifyToken,
    });

    stopLoading();

    if (insertErr) {
      setError(insertErr || "Something went wrong sending your message. Please try again.");
      return;
    }

    onSubmitted(newNo);
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

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Phone number</span>
          <PhoneField dial={phoneDial} onDial={setPhoneDial} digits={phoneDigits} onDigits={setPhoneDigits} required />
          <label className="mt-1 flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={sameWhatsapp} onChange={(e) => setSameWhatsapp(e.target.checked)} className="h-4 w-4 accent-ink" />
            This is also my WhatsApp number
          </label>
        </div>

        {!sameWhatsapp && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">WhatsApp number</span>
            <PhoneField dial={waDial} onDial={setWaDial} digits={waDigits} onDigits={setWaDigits} required />
          </div>
        )}

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-text">Email <span className="font-normal text-text-soft">(Gmail only)</span></span>
          <div className="flex gap-2">
            <input
              type="email"
              required
              pattern="[^\s@]+@gmail\.com"
              title="Use a Gmail address, e.g. name@gmail.com"
              placeholder="yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
            />
            {emailVerified ? (
              <span className="flex items-center rounded-xl bg-green-50 px-3 text-sm font-semibold text-green-700">✓ Verified</span>
            ) : (
              <button type="button" onClick={sendCode} disabled={otpBusy || !email.trim()} className="rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                {otpSent ? "Resend code" : "Send code"}
              </button>
            )}
          </div>
          {otpSent && !emailVerified && (
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code from your email"
                className="min-w-0 flex-1 rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
              />
              <button type="button" onClick={checkCode} disabled={otpBusy || otpCode.length !== 6} className="rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                Verify
              </button>
            </div>
          )}
          {otpMsg && !emailVerified && <p className="text-xs text-text-soft">{otpMsg}</p>}
        </div>

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
