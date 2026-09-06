"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { addToCart } from "@/components/buyer/AddToCartButton";

interface ReorderItem {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export function ReorderButton({ items }: { items: ReorderItem[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Button
      variant="outline"
      fullWidth
      loading={loading}
      onClick={async () => {
        setLoading(true);
        let addedAny = false;
        for (const item of items) {
          const ok = await addToCart(item.productId, { variantId: item.variantId ?? undefined, quantity: item.quantity });
          if (ok) addedAny = true;
        }
        setLoading(false);
        if (!addedAny) {
          toast.error("None of these items are available right now");
          return;
        }
        toast.success("Added to cart");
        router.push("/buyer/cart");
      }}
    >
      <RotateCcw className="h-4 w-4" /> Reorder
    </Button>
  );
}
