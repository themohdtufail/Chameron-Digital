"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Inbox, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils";

interface RequestRow {
  id: string;
  productName: string;
  description: string | null;
  photoUrl: string | null;
  budget: number | null;
  note: string | null;
  status: string;
  sellerAvailable: boolean | null;
  sellerPrice: number | null;
  sellerMessage: string | null;
  fulfilledProduct: { id: string; name: string; slug: string } | null;
  buyer: { name: string | null; phone: string };
  createdAt: string;
}

const STATUS_TONE: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "accent",
  RESPONDED: "success",
  ACCEPTED: "success",
  DECLINED: "neutral",
  CONVERTED: "success",
};

export default function SellerProductRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [fulfilledProductId, setFulfilledProductId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/seller/product-requests", { cache: "no-store" });
    const data = await res.json();
    setRequests(data.requests ?? []);
  }

  useEffect(() => {
    load();
    fetch("/api/seller/products")
      .then((r) => r.json())
      .then((d) => setProducts((d.products ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))));
  }, []);

  async function respond(id: string, available: boolean) {
    setSaving(true);
    const res = await fetch(`/api/seller/product-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerAvailable: available,
        sellerPrice: available && price ? Number(price) : undefined,
        sellerMessage: message || undefined,
        fulfilledProductId: available && fulfilledProductId ? fulfilledProductId : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error || "Could not respond");
      return;
    }
    toast.success("Response sent to buyer");
    setRespondingId(null);
    setPrice("");
    setMessage("");
    setFulfilledProductId("");
    load();
  }

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-lg font-extrabold text-zinc-900 lg:text-2xl">Product requests</h1>

        {!requests && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}

        {requests && requests.length === 0 && (
          <EmptyState icon={Inbox} title="No product requests yet" description="When buyers request items you might carry, they'll show up here." />
        )}

        {requests && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
                <div className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                    {r.photoUrl ? (
                      <Image src={r.photoUrl} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-5 w-5 text-zinc-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-zinc-900">{r.productName}</p>
                      <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
                    </div>
                    {r.description && <p className="mt-0.5 text-sm text-zinc-600">{r.description}</p>}
                    <p className="mt-1 text-xs text-zinc-400">
                      From {r.buyer.name ?? r.buyer.phone}
                      {r.budget ? ` · Budget: ${formatCurrency(r.budget)}` : ""}
                    </p>
                    {r.note && <p className="mt-1 text-xs text-zinc-500">Note: {r.note}</p>}
                  </div>
                </div>

                {r.status !== "PENDING" && (
                  <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm">
                    <p className="font-semibold text-zinc-800">
                      {r.sellerAvailable ? "You said this is available" : "You said this is not available"}
                      {r.sellerPrice ? ` · ${formatCurrency(r.sellerPrice)}` : ""}
                    </p>
                    {r.sellerMessage && <p className="mt-0.5 text-zinc-600">{r.sellerMessage}</p>}
                    {r.fulfilledProduct && (
                      <a
                        href={`/buyer/product/${r.fulfilledProduct.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-brand-600 hover:underline"
                      >
                        Linked to: {r.fulfilledProduct.name}
                      </a>
                    )}
                  </div>
                )}

                {r.status === "PENDING" && respondingId !== r.id && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => setRespondingId(r.id)}>
                      Respond
                    </Button>
                  </div>
                )}

                {r.status === "PENDING" && respondingId === r.id && (
                  <div className="mt-3 space-y-2 rounded-xl border border-zinc-200 p-3">
                    {products.length > 0 && (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-zinc-700">Link an existing product (optional)</label>
                        <select
                          value={fulfilledProductId}
                          onChange={(e) => setFulfilledProductId(e.target.value)}
                          className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                        >
                          <option value="">No product yet</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <Input label="Your price (₹, optional)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                    <Textarea label="Message to buyer (optional)" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" loading={saving} onClick={() => respond(r.id, true)}>
                        I have this
                      </Button>
                      <Button size="sm" variant="outline" loading={saving} onClick={() => respond(r.id, false)}>
                        Not available
                      </Button>
                      <button onClick={() => setRespondingId(null)} className="text-xs font-semibold text-zinc-400">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
