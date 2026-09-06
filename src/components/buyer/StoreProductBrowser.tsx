"use client";

import { useMemo, useState } from "react";
import { Search, PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { StoreProductCard } from "@/components/buyer/StoreProductCard";
import type { ProductSummary } from "@/types";

interface ProductCategoryLite {
  id: string;
  name: string;
}

export function StoreProductBrowser({
  productCategories,
  products,
}: {
  productCategories: ProductCategoryLite[];
  products: (ProductSummary & { categoryId: string | null })[];
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "offers" | string>("all");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (activeTab === "offers") return Boolean(p.discountPrice);
      if (activeTab !== "all") return p.categoryId === activeTab;
      return true;
    });
  }, [products, query, activeTab]);

  return (
    <div>
      <div className="px-4 lg:px-8">
        <div className="relative lg:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products in this store"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 lg:px-8">
        <Tab active={activeTab === "all"} onClick={() => setActiveTab("all")}>
          All
        </Tab>
        {productCategories.map((c) => (
          <Tab key={c.id} active={activeTab === c.id} onClick={() => setActiveTab(c.id)}>
            {c.name}
          </Tab>
        ))}
        <Tab active={activeTab === "offers"} onClick={() => setActiveTab("offers")}>
          Offers
        </Tab>
      </div>

      <div className="px-4 py-4 lg:px-8 lg:py-6">
        {filtered.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No products found" description="Try a different search or category." />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
            {filtered.map((p) => (
              <StoreProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
        active ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
      )}
    >
      {children}
    </button>
  );
}
