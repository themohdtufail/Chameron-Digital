"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export async function addToCart(
  productId: string,
  opts: { variantId?: string; quantity?: number } = {}
): Promise<boolean> {
  const res = await fetch("/api/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, ...opts }),
  });
  const data = await res.json();

  if (res.status === 409 && data.error === "different_store") {
    const confirmed = window.confirm(
      "Your cart has items from another store. Replace your cart with this item?"
    );
    if (!confirmed) return false;
    const retry = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, ...opts, replaceCart: true }),
    });
    if (!retry.ok) {
      toast.error("Could not add to cart");
      return false;
    }
    return true;
  }

  if (!res.ok) {
    toast.error(data.error || "Could not add to cart");
    return false;
  }
  return true;
}

export function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
  size = "md",
  fullWidth,
  disabled,
  label = "Add to cart",
}: {
  productId: string;
  variantId?: string;
  quantity?: number;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Button
      size={size}
      fullWidth={fullWidth}
      variant="outline"
      loading={loading}
      disabled={disabled}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);
        const ok = await addToCart(productId, { variantId, quantity });
        setLoading(false);
        if (ok) {
          toast.success("Added to cart");
          router.refresh();
        }
      }}
    >
      <ShoppingCart className="h-4 w-4" /> {label}
    </Button>
  );
}
