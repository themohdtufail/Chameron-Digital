import Link from "next/link";
import { MapPin, ChevronDown } from "lucide-react";
import { SearchBar } from "@/components/buyer/SearchBar";

export function TopBar({ locationLabel }: { locationLabel: string }) {
  return (
    <div className="sticky top-0 z-30 space-y-3 border-b border-zinc-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
      <Link href="/buyer/location" className="flex w-fit items-center gap-1 text-sm font-semibold text-zinc-800">
        <MapPin className="h-4 w-4 text-brand-600" />
        {locationLabel}
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
      </Link>
      <SearchBar />
    </div>
  );
}
