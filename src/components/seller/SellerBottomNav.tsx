"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ClipboardList, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/seller/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/seller/products", label: "Products", icon: Package },
  { href: "/seller/orders", label: "Orders", icon: ClipboardList },
  { href: "/seller/notifications", label: "Alerts", icon: Bell },
  { href: "/seller/settings", label: "Settings", icon: Settings },
];

export function SellerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[480px] border-t border-zinc-100 bg-white/95 backdrop-blur lg:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium">
            <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-zinc-400")} strokeWidth={active ? 2.4 : 2} />
            <span className={active ? "text-brand-600" : "text-zinc-400"}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
