"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  relatedOrderId: string | null;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationList({ orderHrefPrefix }: { orderHrefPrefix: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);

  async function load() {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    const data = await res.json();
    setNotifications(data.notifications ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? null);
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  async function markAllRead() {
    setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
    await fetch("/api/notifications", { method: "POST" });
  }

  if (!notifications) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return <EmptyState icon={Bell} title="No notifications yet" description="Updates about your orders will show up here." />;
  }

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div>
      {hasUnread && (
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
          </button>
        </div>
      )}
      <div className="divide-y divide-zinc-100 px-4 py-2">
        {notifications.map((n) => {
          const content = (
            <div
              className={cn(
                "flex gap-3 rounded-xl p-3 transition",
                !n.isRead && "bg-brand-50/60"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                  n.isRead ? "bg-transparent" : "bg-brand-600"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-900">{n.title}</p>
                <p className="mt-0.5 text-sm text-zinc-600">{n.body}</p>
                <p className="mt-1 text-xs text-zinc-400">{timeAgo(n.createdAt)}</p>
              </div>
            </div>
          );

          if (n.relatedOrderId) {
            return (
              <a
                key={n.id}
                href={`${orderHrefPrefix}/${n.relatedOrderId}`}
                onClick={() => !n.isRead && markRead(n.id)}
                className="block"
              >
                {content}
              </a>
            );
          }

          return (
            <button key={n.id} onClick={() => !n.isRead && markRead(n.id)} className="block w-full text-left">
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
