"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm, emptyProductForm } from "@/components/seller/ProductForm";

export default function NewProductPage() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/seller/product-categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  return (
    <div className="animate-fade-in px-4 py-5">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/seller/products">
          <ArrowLeft className="h-5 w-5 text-zinc-700" />
        </Link>
        <h1 className="text-lg font-extrabold text-zinc-900">Add product</h1>
      </div>
      <ProductForm categories={categories} initial={emptyProductForm} />
    </div>
  );
}
