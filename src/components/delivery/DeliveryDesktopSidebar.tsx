"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";

const items = [
  { href: "/delivery/deliveries", label: "Deliveries", icon: Truck },
  { href: "/delivery/notifications", label: "Notifications", icon: Bell },
  { href: "/delivery/settings", label: "Settings", icon: Settings },
];

export function DeliveryDesktopSidebar({ name }: { name: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-zinc-100 bg-white lg:flex">
      <div className="border-b border-zinc-100 px-5 py-4">
        <Logo markSize={28} />
      </div>

      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
          <Truck className="h-4 w-4 text-brand-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-900">{name ?? "Delivery partner"}</p>
          <p className="text-xs text-zinc-400">Delivery partner</p>
        </div>
        <NotificationBell
          href="/delivery/notifications"
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-50"
        />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active ? "bg-brand-50 text-brand-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
