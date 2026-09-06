"use client";

import toast from "react-hot-toast";
import { Phone, MessageCircle, Share2, Navigation } from "lucide-react";

export function StoreActions({
  phone,
  storeName,
  directionsUrl,
}: {
  phone: string;
  storeName: string;
  directionsUrl?: string;
}) {
  const digits = phone.replace(/[^0-9]/g, "");

  return (
    <div className={`grid gap-2 ${directionsUrl ? "grid-cols-4" : "grid-cols-3"}`}>
      <a
        href={`tel:${phone}`}
        className="flex flex-col items-center gap-1 rounded-xl border border-zinc-100 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-95"
      >
        <Phone className="h-4 w-4 text-brand-600" /> Call
      </a>
      <a
        href={`https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${storeName}, I have a question about your products.`)}`}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center gap-1 rounded-xl border border-zinc-100 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-95"
      >
        <MessageCircle className="h-4 w-4 text-success-500" /> Chat
      </a>
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-1 rounded-xl border border-zinc-100 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-95"
        >
          <Navigation className="h-4 w-4 text-brand-600" /> Directions
        </a>
      )}
      <button
        onClick={async () => {
          const url = typeof window !== "undefined" ? window.location.href : "";
          if (navigator.share) {
            try {
              await navigator.share({ title: storeName, url });
            } catch {
              /* user cancelled */
            }
          } else {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied");
          }
        }}
        className="flex flex-col items-center gap-1 rounded-xl border border-zinc-100 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-95"
      >
        <Share2 className="h-4 w-4 text-zinc-500" /> Share
      </button>
    </div>
  );
}
