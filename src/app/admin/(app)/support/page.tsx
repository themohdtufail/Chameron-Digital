"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LifeBuoy, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

interface TicketRow {
  id: string;
  subject: string;
  category: string;
  status: string;
  updatedAt: string;
  user: { name: string | null; phone: string; role: string };
  replies: { message: string }[];
}

const TABS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const STATUS_TONE: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  OPEN: "accent",
  IN_PROGRESS: "accent",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export default function AdminSupportPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("OPEN");
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTickets(null);
    fetch(`/api/admin/support-tickets?status=${tab}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTickets(d.tickets ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-zinc-900">
        <LifeBuoy className="h-5 w-5" /> Support tickets
      </h1>

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
              tab === t ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600"
            )}
          >
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      {!tickets ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No tickets" description="Nothing in this category right now." />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/admin/support/${t.id}`}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-zinc-900">{t.subject}</p>
                  <Badge tone={STATUS_TONE[t.status]}>{t.status.replace("_", " ")}</Badge>
                </div>
                <p className="text-xs text-zinc-500">
                  {t.user.name ?? t.user.phone} · {t.user.role} · {t.category}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-400">{t.replies[0]?.message ?? ""}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
