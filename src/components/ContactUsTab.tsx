import { ContactUsForm } from "@/components/ContactUsForm";

export function ContactUsTab({
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
  return (
    <div className="flex flex-col gap-6">
      <ContactUsForm
        userId={userId}
        businessId={businessId}
        defaultName={defaultName}
        defaultEmail={defaultEmail}
      />
    </div>
  );
}
