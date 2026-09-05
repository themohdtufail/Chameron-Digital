import Image from "next/image";
import Link from "next/link";
import { Store as StoreIcon, Truck } from "lucide-react";
import { RatingStars } from "@/components/ui/RatingStars";
import { Badge } from "@/components/ui/Badge";
import { formatDistance } from "@/lib/utils";
import type { StoreSummary } from "@/types";

export function StoreCard({ store }: { store: StoreSummary }) {
  return (
    <Link
      href={`/buyer/store/${store.slug}`}
      className="block w-full shrink-0 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-card transition active:scale-[0.98]"
    >
      <div className="relative h-32 w-full bg-zinc-100">
        {store.coverUrl ? (
          <Image src={store.coverUrl} alt={store.name} fill className="object-cover" sizes="320px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50">
            <StoreIcon className="h-8 w-8 text-brand-300" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <Badge tone={store.isOpenNow ? "success" : "danger"}>
            {store.isOpenNow ? "Open now" : "Closed"}
          </Badge>
        </div>
        {store.logoUrl && (
          <div className="absolute -bottom-5 left-3 h-11 w-11 overflow-hidden rounded-xl border-2 border-white bg-white shadow-card">
            <Image src={store.logoUrl} alt="" width={44} height={44} className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      <div className="p-3 pt-6">
        <p className="truncate text-[15px] font-bold text-zinc-900">{store.name}</p>
        <p className="truncate text-xs text-zinc-500">{store.categoryName ?? "Local store"}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <RatingStars rating={store.ratingAvg} count={store.ratingCount} />
          {store.distanceKm !== null && (
            <span className="text-xs font-medium text-zinc-500">{formatDistance(store.distanceKm)}</span>
          )}
        </div>
        {store.deliveryAvailable && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-brand-600">
            <Truck className="h-3 w-3" /> Delivery available
          </div>
        )}
      </div>
    </Link>
  );
}
