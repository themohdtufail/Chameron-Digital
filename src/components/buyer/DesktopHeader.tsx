import Link from "next/link";
import { MapPin, ChevronDown, ShoppingCart, Heart, User } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { SearchBar } from "@/components/buyer/SearchBar";
import { DesktopNavLinks } from "@/components/buyer/DesktopNavLinks";
import { NotificationBell } from "@/components/NotificationBell";

export async function DesktopHeader() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [location, cart] = await Promise.all([
    prisma.location.findFirst({
      where: { userId: user.id },
      orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
    }),
    prisma.cart.findUnique({ where: { userId: user.id }, include: { _count: { select: { items: true } } } }),
  ]);

  const locationLabel = location ? `${location.area ? `${location.area}, ` : ""}${location.city}` : "Set location";
  const cartCount = cart?._count.items ?? 0;

  return (
    <header className="hidden border-b border-zinc-100 bg-white/95 backdrop-blur lg:block">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-8 py-3.5">
        <Link href="/buyer/home" className="shrink-0">
          <Logo markSize={32} />
        </Link>

        <DesktopNavLinks />

        <Link href="/buyer/location" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-brand-600">
          <MapPin className="h-4 w-4 text-brand-600" />
          {locationLabel}
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        </Link>

        <div className="w-72 shrink-0">
          <SearchBar />
        </div>

        <Link
          href="/buyer/wishlist"
          className="flex shrink-0 h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
          aria-label="Wishlist"
        >
          <Heart className="h-4 w-4" />
        </Link>

        <NotificationBell href="/buyer/notifications" />

        <Link
          href="/buyer/profile"
          className="flex shrink-0 h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
          aria-label="Profile"
        >
          <User className="h-4 w-4" />
        </Link>

        <Link
          href="/buyer/cart"
          className="relative flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 px-3.5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
