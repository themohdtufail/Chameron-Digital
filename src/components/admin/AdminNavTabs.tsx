"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/delivery-partners", label: "Delivery" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminNavTabs() {
  const pathname = usePathname();
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-zinc-200">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition",
              active ? "border-brand-600 text-brand-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
