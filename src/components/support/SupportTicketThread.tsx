"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

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
  replies: Reply[];
}

const STATUS_TONE: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  OPEN: "accent",
  IN_PROGRESS: "accent",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export function SupportTicketThread({ ticketId, basePath }: { ticketId: string; basePath: string }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    const res = await fetch(`/api/support/tickets/${ticketId}`, { cache: "no-store" });
    if (!res.ok) {
      setTicket(null);
      return;
    }
    const data = await res.json();
    setTicket(data.ticket);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function submit() {
    if (!message.trim()) return;
    setSending(true);
    const res = await fetch(`/api/support/tickets/${ticketId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Couldn't send reply");
      return;
    }
    setMessage("");
    load();
  }

  if (!ticket) {
    return (
      <div className="px-4 py-5 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-2xl space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const closed = ticket.status === "CLOSED";

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-2xl">
        <Link href={basePath} className="flex items-center gap-1.5 text-sm font-semibold text-zinc-600">
          <ArrowLeft className="h-4 w-4" /> Back to support
        </Link>

        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-zinc-900 lg:text-xl">{ticket.subject}</h1>
          <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status.replace("_", " ")}</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {ticket.replies.map((r) => (
            <div
              key={r.id}
              className={`max-w-[85%] rounded-2xl p-3.5 text-sm ${
                r.isFromAdmin ? "bg-brand-50 text-brand-900" : "ml-auto bg-zinc-100 text-zinc-800"
              }`}
            >
              <p className="mb-1 text-xs font-semibold opacity-70">{r.isFromAdmin ? "Support team" : "You"}</p>
              <p className="whitespace-pre-wrap">{r.message}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          {closed ? (
            <p className="text-sm text-zinc-500">This ticket is closed. Raise a new ticket if you need further help.</p>
          ) : (
            <>
              <Textarea
                rows={3}
                placeholder="Type your reply…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
              />
              <Button className="mt-2" size="sm" loading={sending} onClick={submit}>
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
