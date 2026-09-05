"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/buyer/home", label: "Home", icon: Home },
  { href: "/buyer/categories", label: "Categories", icon: LayoutGrid },
  { href: "/buyer/orders", label: "Orders", icon: ClipboardList },
  { href: "/buyer/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[480px] border-t border-zinc-100 bg-white/95 backdrop-blur">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
          >
            <Icon
              className={cn("h-5 w-5", active ? "text-brand-600" : "text-zinc-400")}
              strokeWidth={active ? 2.4 : 2}
            />
            <span className={active ? "text-brand-600" : "text-zinc-400"}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
