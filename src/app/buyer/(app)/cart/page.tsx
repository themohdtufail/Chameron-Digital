"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { Minus, Plus, Trash2, ShoppingBag, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils";

interface CartLine {
  id: string;
  name: string;
  variantLabel: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  maxStock: number;
  status: string;
}

interface CartDetails {
  store: { id: string; slug: string; name: string; deliveryAvailable: boolean } | null;
  items: CartLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/cart", { cache: "no-store" });
    setCart(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateQuantity(itemId: string, quantity: number) {
    setBusyId(itemId);
    const res = await fetch(`/api/cart/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    setCart(await res.json());
    setBusyId(null);
  }

  async function removeItem(itemId: string) {
    setBusyId(itemId);
    const res = await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
    setCart(await res.json());
    setBusyId(null);
    toast.success("Removed from cart");
  }

  return (
    <div className="animate-fade-in pb-32 lg:pb-16">
      <div className="sticky top-0 z-30 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-8 lg:backdrop-blur-none">
        <div className="page-container">
          <h1 className="text-lg font-extrabold text-zinc-900 lg:px-8 lg:text-2xl">My Cart</h1>
        </div>
      </div>

      {loading && (
        <div className="page-container space-y-3 p-4 lg:px-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && cart && cart.items.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse nearby stores and add products you love."
          action={
            <Link href="/buyer/home">
              <Button>Start shopping</Button>
            </Link>
          }
        />
      )}

      {!loading && cart && cart.items.length > 0 && (
        <div className="page-container px-4 py-4 lg:px-8 lg:py-6">
          <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-8">
            <div className="lg:col-span-2">
              {cart.store && (
                <p className="mb-3 text-sm font-semibold text-zinc-500">
                  Order from <span className="text-zinc-900">{cart.store.name}</span>
                </p>
              )}
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-2xl border border-zinc-100 bg-white p-3 shadow-card">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageOff className="h-5 w-5 text-zinc-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">{item.name}</p>
                      {item.variantLabel && <p className="text-xs text-zinc-500">{item.variantLabel}</p>}
                      <p className="mt-0.5 text-sm font-bold text-zinc-900">{formatCurrency(item.unitPrice)}</p>
                      {item.status !== "AVAILABLE" && (
                        <p className="mt-1 text-xs font-semibold text-danger-600">No longer available</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-1.5 py-1">
                          <button
                            disabled={busyId === item.id}
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            disabled={busyId === item.id || item.quantity >= item.maxStock}
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          disabled={busyId === item.id}
                          onClick={() => removeItem(item.id)}
                          className="text-zinc-400 hover:text-danger-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:sticky lg:top-8 lg:col-span-1">
              <div className="mt-6 space-y-2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card lg:mt-0">
                <Row label="Subtotal" value={formatCurrency(cart.subtotal)} />
                <Row label="Delivery charge" value={cart.deliveryFee ? formatCurrency(cart.deliveryFee) : "Free"} />
                <div className="my-1 border-t border-dashed border-zinc-200" />
                <Row label="Total" value={formatCurrency(cart.total)} bold />
                <Link href="/buyer/checkout" className="hidden lg:block">
                  <Button size="lg" fullWidth className="mt-3">
                    Proceed to checkout
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && cart && cart.items.length > 0 && (
        <div className="action-bar fixed inset-x-0 bottom-0 z-40 border-t border-zinc-100 p-4 lg:hidden">
          <Link href="/buyer/checkout">
            <Button size="lg" fullWidth>
              Proceed to checkout · {formatCurrency(cart.total)}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? "font-bold text-zinc-900" : "text-zinc-500"}>{label}</span>
      <span className={bold ? "font-extrabold text-zinc-900" : "font-medium text-zinc-700"}>{value}</span>
    </div>
  );
}
