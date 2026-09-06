"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  LayoutGrid,
  Boxes,
  ClipboardList,
  Inbox,
  BarChart3,
  Users,
  Settings,
  ShieldCheck,
  CreditCard,
  Tag,
  Store as StoreIcon,
  ExternalLink,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";

const items = [
  { href: "/seller/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/seller/products", label: "Products", icon: Package },
  { href: "/seller/categories", label: "Categories", icon: LayoutGrid },
  { href: "/seller/inventory", label: "Inventory", icon: Boxes },
  { href: "/seller/orders", label: "Orders", icon: ClipboardList },
  { href: "/seller/requests", label: "Product requests", icon: Inbox },
  { href: "/seller/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/seller/customers", label: "Customers", icon: Users },
  { href: "/seller/coupons", label: "Coupons", icon: Tag },
  { href: "/seller/plans", label: "Plans & billing", icon: CreditCard },
  { href: "/seller/verification", label: "Verification", icon: ShieldCheck },
  { href: "/seller/support", label: "Support", icon: LifeBuoy },
  { href: "/seller/settings", label: "Settings", icon: Settings },
];

export function SellerDesktopSidebar({
  store,
}: {
  store: { name: string; logoUrl: string | null; slug: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-zinc-100 bg-white lg:flex">
      <div className="border-b border-zinc-100 px-5 py-4">
        <Logo markSize={28} />
      </div>

      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
          {store.logoUrl ? (
            <Image src={store.logoUrl} alt="" fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <StoreIcon className="h-4 w-4 text-zinc-300" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-900">{store.name}</p>
          <Link
            href={`/buyer/store/${store.slug}`}
            target="_blank"
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
          >
            View store <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <NotificationBell
          href="/seller/notifications"
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
