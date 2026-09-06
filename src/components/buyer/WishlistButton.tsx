"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  initialWishlisted,
  size = "md",
  className,
}: {
  productId: string;
  initialWishlisted: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const next = !wishlisted;
    setWishlisted(next);
    try {
      const res = await fetch(next ? "/api/wishlist" : `/api/wishlist/${productId}`, {
        method: next ? "POST" : "DELETE",
        headers: next ? { "Content-Type": "application/json" } : undefined,
        body: next ? JSON.stringify({ productId }) : undefined,
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Added to wishlist" : "Removed from wishlist");
    } catch {
      setWishlisted(!next);
      toast.error("Could not update wishlist");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wishlisted}
      className={cn(
        "flex items-center justify-center rounded-full bg-white/90 shadow-card transition active:scale-90",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
        className
      )}
    >
      <Heart
        className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", wishlisted ? "fill-danger-500 text-danger-500" : "text-zinc-500")}
      />
    </button>
  );
}
