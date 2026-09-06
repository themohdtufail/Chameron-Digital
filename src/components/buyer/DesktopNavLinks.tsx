"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/buyer/home", label: "Home" },
  { href: "/buyer/categories", label: "Categories" },
  { href: "/buyer/orders", label: "Orders" },
  { href: "/buyer/profile", label: "Profile" },
];

export function DesktopNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 items-center gap-1">
      {items.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold transition",
              active ? "bg-brand-50 text-brand-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
