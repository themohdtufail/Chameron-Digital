import { Phone, MessageCircle } from "lucide-react";

export function ContactStoreButtons({
  phone,
  storeName,
  orderNumber,
}: {
  phone: string;
  storeName: string;
  orderNumber: string;
}) {
  const digits = phone.replace(/[^0-9]/g, "");

  return (
    <div className="grid grid-cols-2 gap-2">
      <a
        href={`tel:${phone}`}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-100 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-95"
      >
        <Phone className="h-4 w-4 text-brand-600" /> Call store
      </a>
      <a
        href={`https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${storeName}, I have a question about my order ${orderNumber}.`)}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-100 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-95"
      >
        <MessageCircle className="h-4 w-4 text-success-500" /> Message store
      </a>
    </div>
  );
}
