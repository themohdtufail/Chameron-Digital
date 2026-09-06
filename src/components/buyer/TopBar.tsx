import Link from "next/link";
import { MapPin, ChevronDown } from "lucide-react";
import { SearchBar } from "@/components/buyer/SearchBar";
import { NotificationBell } from "@/components/NotificationBell";

export function TopBar({ locationLabel }: { locationLabel: string }) {
  return (
    <div className="sticky top-0 z-30 space-y-3 border-b border-zinc-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link href="/buyer/location" className="flex min-w-0 items-center gap-1 text-sm font-semibold text-zinc-800">
          <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
          <span className="truncate">{locationLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        </Link>
        <NotificationBell
          href="/buyer/notifications"
          className="relative flex h-8 w-8 shrink-0 items-center justify-center text-zinc-600"
        />
      </div>
      <SearchBar />
    </div>
  );
}
