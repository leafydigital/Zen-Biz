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
      <div>
        <p className="text-sm text-text-soft">
          LeafyDigital ·{" "}
          <a href="mailto:leafydigital@gmail.com" className="text-ink hover:underline">
            leafydigital@gmail.com
          </a>
        </p>
        <p className="text-sm text-text-soft">Address: to be added</p>
      </div>
      <ContactUsForm
        userId={userId}
        businessId={businessId}
        defaultName={defaultName}
        defaultEmail={defaultEmail}
      />
    </div>
  );
}
