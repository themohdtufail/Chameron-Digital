"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export function StoreOpenToggle({ isManuallyClosed }: { isManuallyClosed: boolean }) {
  const [closed, setClosed] = useState(isManuallyClosed);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const next = !closed;
        const res = await fetch("/api/seller/store", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isManuallyClosed: next }),
        });
        setLoading(false);
        if (!res.ok) {
          toast.error("Could not update store status");
          return;
        }
        setClosed(next);
        toast.success(next ? "Store marked closed" : "Store marked open");
        router.refresh();
      }}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition",
        closed ? "border-danger-200 bg-danger-50 text-danger-600" : "border-success-200 bg-success-50 text-success-600"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", closed ? "bg-danger-500" : "bg-success-500")} />
      {closed ? "Closed" : "Open"}
    </button>
  );
}
