"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { StoreCard } from "@/components/buyer/StoreCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { StoreSummary } from "@/types";

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "nearest", label: "Nearest" },
  { value: "top-rated", label: "Top rated" },
];

const RATING_OPTIONS = [0, 3, 4, 4.5];

export default function StoresDiscoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sort, setSort] = useState(searchParams.get("sort") || "recommended");
  const [openNow, setOpenNow] = useState(searchParams.get("openNow") === "true");
  const [minRating, setMinRating] = useState(Number(searchParams.get("minRating") || 0));
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [showFilters, setShowFilters] = useState(false);

  const [stores, setStores] = useState<StoreSummary[] | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 4000 }
    );
  }, []);

  const load = useCallback(async () => {
    setStores(null);
    const params = new URLSearchParams();
    params.set("sort", sort);
    params.set("page", String(page));
    if (openNow) params.set("openNow", "true");
    if (minRating > 0) params.set("minRating", String(minRating));
    if (coords) {
      params.set("lat", String(coords.lat));
      params.set("lng", String(coords.lng));
    }
    const res = await fetch(`/api/stores?${params.toString()}`);
    const data = await res.json();
    setStores(data.stores ?? []);
    setTotalPages(data.totalPages ?? 1);
    setTotal(data.total ?? 0);
  }, [sort, page, openNow, minRating, coords]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [sort, openNow, minRating]);

  function updateUrl(next: Partial<{ sort: string; openNow: boolean; minRating: number; page: number }>) {
    const params = new URLSearchParams();
    params.set("sort", next.sort ?? sort);
    if (next.openNow ?? openNow) params.set("openNow", "true");
    if ((next.minRating ?? minRating) > 0) params.set("minRating", String(next.minRating ?? minRating));
    params.set("page", String(next.page ?? page));
    router.replace(`/buyer/stores?${params.toString()}`);
  }

  return (
    <div className="animate-fade-in pb-10">
      <div className="sticky top-0 z-30 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:pt-8 lg:backdrop-blur-none">
        <div className="page-container lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">All Stores</h1>
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 lg:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </button>
          </div>
        </div>
      </div>

      <div className="page-container px-4 py-4 lg:px-8 lg:py-6">
        <div className={cn("mb-4 flex flex-wrap items-center gap-2 lg:flex", !showFilters && "hidden")}>
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setSort(s.value);
                updateUrl({ sort: s.value, page: 1 });
              }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                sort === s.value ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {s.label}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-zinc-200 lg:block" />
          <button
            onClick={() => {
              const next = !openNow;
              setOpenNow(next);
              updateUrl({ openNow: next, page: 1 });
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              openNow ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            )}
          >
            Open now
          </button>
          {RATING_OPTIONS.filter((r) => r > 0).map((r) => (
            <button
              key={r}
              onClick={() => {
                const next = minRating === r ? 0 : r;
                setMinRating(next);
                updateUrl({ minRating: next, page: 1 });
              }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                minRating === r ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {r}+ rating
            </button>
          ))}
        </div>

        {stores === null && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full" />
            ))}
          </div>
        )}

        {stores !== null && stores.length === 0 && (
          <EmptyState icon={Compass} title="No stores match your filters" description="Try adjusting the filters above." />
        )}

        {stores !== null && stores.length > 0 && (
          <>
            <p className="mb-3 text-xs font-medium text-zinc-400">{total} stores found</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => p - 1);
                    updateUrl({ page: page - 1 });
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-zinc-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                    updateUrl({ page: page + 1 });
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
