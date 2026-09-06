"use client";

import toast from "react-hot-toast";
import { Share2 } from "lucide-react";

export function ShareButton({ title, className }: { title: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        const url = typeof window !== "undefined" ? window.location.href : "";
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
          } catch {
            /* user cancelled */
          }
        } else {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied");
        }
      }}
      aria-label="Share"
      className={className ?? "flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"}
    >
      <Share2 className="h-4 w-4" />
    </button>
  );
}
