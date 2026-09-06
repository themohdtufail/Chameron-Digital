"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Send } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface Reply {
  id: string;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
  author: { name: string | null; role: string } | null;
}

interface TicketDetail {
  id: string;
  subject: string;
  category: string;
  status: string;
  user: { name: string | null; phone: string; role: string };
  replies: Reply[];
}

const STATUS_TONE: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  OPEN: "accent",
  IN_PROGRESS: "accent",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export default function AdminSupportTicketPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/support-tickets/${params.id}`, { cache: "no-store" });
    const data = await res.json();
    setTicket(data.ticket);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function sendReply() {
    if (!message.trim()) return;
    setSending(true);
    const res = await fetch(`/api/admin/support-tickets/${params.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setSending(false);
    if (!res.ok) {
      toast.error("Couldn't send reply");
      return;
    }
    setMessage("");
    load();
  }

  async function changeStatus(status: string) {
    setChangingStatus(true);
    const res = await fetch(`/api/admin/support-tickets/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setChangingStatus(false);
    if (!res.ok) {
      toast.error("Couldn't update status");
      return;
    }
    toast.success(`Ticket marked ${status.replace("_", " ").toLowerCase()}`);
    load();
  }

  if (!ticket) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/support" className="flex items-center gap-1.5 text-sm font-semibold text-zinc-600">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-extrabold text-zinc-900">{ticket.subject}</h1>
        <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status.replace("_", " ")}</Badge>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        {ticket.user.name ?? ticket.user.phone} · {ticket.user.phone} · {ticket.user.role} · {ticket.category}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            disabled={changingStatus || ticket.status === s}
            onClick={() => changeStatus(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50",
              ticket.status === s ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600"
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="mt-5 max-w-2xl space-y-3">
        {ticket.replies.map((r) => (
          <div
            key={r.id}
            className={`max-w-[85%] rounded-2xl p-3.5 text-sm ${
              r.isFromAdmin ? "ml-auto bg-brand-50 text-brand-900" : "bg-zinc-100 text-zinc-800"
            }`}
          >
            <p className="mb-1 text-xs font-semibold opacity-70">
              {r.isFromAdmin ? "Support team" : r.author?.name ?? "User"}
            </p>
            <p className="whitespace-pre-wrap">{r.message}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 max-w-2xl rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
        <Textarea rows={3} placeholder="Reply to the customer…" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
        <Button className="mt-2" size="sm" loading={sending} onClick={sendReply}>
          <Send className="h-3.5 w-3.5" /> Send reply
        </Button>
      </div>
    </div>
  );
}
