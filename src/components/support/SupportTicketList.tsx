"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { LifeBuoy, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

interface TicketRow {
  id: string;
  subject: string;
  category: string;
  status: string;
  updatedAt: string;
  replies: { message: string; createdAt: string }[];
}

const STATUS_TONE: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  OPEN: "accent",
  IN_PROGRESS: "accent",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const CATEGORIES = ["ORDER", "PAYMENT", "ACCOUNT", "PRODUCT", "OTHER"] as const;

export function SupportTicketList({ basePath }: { basePath: string }) {
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "OTHER" as (typeof CATEGORIES)[number], message: "" });

  async function load() {
    const res = await fetch("/api/support/tickets", { cache: "no-store" });
    const data = await res.json();
    setTickets(data.tickets ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error("Please fill in a subject and message.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Couldn't create ticket");
      return;
    }
    toast.success("Ticket created — we'll get back to you soon.");
    setForm({ subject: "", category: "OTHER", message: "" });
    setShowForm(false);
    load();
  }

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-zinc-900 lg:text-2xl">
            <LifeBuoy className="h-5 w-5 text-brand-600" /> Support
          </h1>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> New ticket
          </Button>
        </div>

        {showForm && (
          <div className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
            <Input label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={150} />
            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as (typeof CATEGORIES)[number] })}
                className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-[15px] text-zinc-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <Textarea
                label="Message"
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                maxLength={2000}
              />
            </div>
            <Button className="mt-3" loading={saving} onClick={submit} fullWidth>
              Submit ticket
            </Button>
          </div>
        )}

        <div className="mt-5">
          {tickets === null ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="No support tickets yet"
              description="Need help with an order, payment, or your account? Raise a ticket and we'll respond here."
            />
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <Link
                  key={t.id}
                  href={`${basePath}/${t.id}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white p-4 shadow-card"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-900">{t.subject}</p>
                      <Badge tone={STATUS_TONE[t.status]}>{t.status.replace("_", " ")}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">{t.replies[0]?.message ?? ""}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
