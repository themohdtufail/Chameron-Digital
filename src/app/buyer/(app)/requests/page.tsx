"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Inbox, ImageOff, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { FileUpload } from "@/components/seller/FileUpload";
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
  store: { name: string; slug: string } | null;
  fulfilledProduct: { id: string; name: string; slug: string } | null;
  createdAt: string;
}

const STATUS_TONE: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "accent",
  RESPONDED: "accent",
  ACCEPTED: "success",
  DECLINED: "neutral",
  CONVERTED: "success",
};

export default function BuyerRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [form, setForm] = useState({ productName: "", description: "", budget: "", note: "", storeId: "" });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/product-requests", { cache: "no-store" });
    const data = await res.json();
    setRequests(data.requests ?? []);
  }

  useEffect(() => {
    load();
    fetch("/api/stores?sort=recommended")
      .then((r) => r.json())
      .then((d) => setStores((d.stores ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))));
  }, []);

  async function submit() {
    if (!form.productName.trim()) {
      toast.error("What are you looking for?");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/product-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: form.productName,
        description: form.description || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        note: form.note || undefined,
        storeId: form.storeId || undefined,
        photoUrl: photoUrl || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error || "Could not submit request");
      return;
    }
    toast.success("Request sent!");
    setForm({ productName: "", description: "", budget: "", note: "", storeId: "" });
    setPhotoUrl(null);
    setShowForm(false);
    load();
  }

  async function decide(id: string, decision: "ACCEPTED" | "DECLINED") {
    setDecidingId(id);
    const res = await fetch(`/api/product-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setDecidingId(null);
    if (!res.ok) {
      toast.error((await res.json()).error || "Could not update request");
      return;
    }
    toast.success(decision === "ACCEPTED" ? "Great! Head to the product to complete your purchase." : "Request declined");
    load();
  }

  return (
    <div className="animate-fade-in pb-10">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 lg:px-8 lg:pt-8">
          <div className="flex items-center gap-3">
            <Link href="/buyer/profile" className="lg:hidden">
              <ArrowLeft className="h-5 w-5 text-zinc-700" />
            </Link>
            <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">My Requests</h1>
          </div>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> New request
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 lg:px-8 lg:py-6">
        {showForm && (
          <div className="mb-5 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
            <p className="text-sm font-bold text-zinc-900">What are you looking for?</p>
            <Input
              label="Item"
              placeholder="e.g. Blue denim jacket, size L"
              value={form.productName}
              onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
            />
            <Textarea
              label="Description (optional)"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="w-28">
              <FileUpload value={photoUrl} onChange={setPhotoUrl} folder="requests" label="Reference photo (optional)" />
            </div>
            <Input
              label="Budget (₹, optional)"
              type="number"
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Preferred store (optional)</label>
              <select
                value={form.storeId}
                onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
                className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-[15px] outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Any store</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              label="Note (optional)"
              rows={2}
              placeholder="Anything else the seller should know"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
            <Button fullWidth loading={saving} onClick={submit}>
              Send request
            </Button>
          </div>
        )}

        {!requests && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {requests && requests.length === 0 && !showForm && (
          <EmptyState
            icon={Inbox}
            title="No requests yet"
            description="Can't find something? Ask local sellers directly."
            action={<Button onClick={() => setShowForm(true)}>New request</Button>}
          />
        )}

        {requests && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
                <div className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                    {r.photoUrl ? (
                      <Image src={r.photoUrl} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-4 w-4 text-zinc-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-zinc-900">{r.productName}</p>
                      <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {r.store ? r.store.name : "Any store"}
                      {r.budget ? ` · Budget: ${formatCurrency(r.budget)}` : ""}
                    </p>
                  </div>
                </div>

                {(r.status === "RESPONDED" || r.status === "ACCEPTED") && (
                  <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm">
                    <p className="font-semibold text-zinc-800">
                      {r.sellerAvailable ? "Available" : "Not available"}
                      {r.sellerPrice ? ` · ${formatCurrency(r.sellerPrice)}` : ""}
                    </p>
                    {r.sellerMessage && <p className="mt-0.5 text-zinc-600">{r.sellerMessage}</p>}
                  </div>
                )}

                {r.status === "RESPONDED" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" loading={decidingId === r.id} onClick={() => decide(r.id, "ACCEPTED")}>
                      <Check className="h-3.5 w-3.5" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" loading={decidingId === r.id} onClick={() => decide(r.id, "DECLINED")}>
                      <XIcon className="h-3.5 w-3.5" /> Decline
                    </Button>
                  </div>
                )}

                {r.status === "ACCEPTED" && r.fulfilledProduct && (
                  <Link href={`/buyer/product/${r.fulfilledProduct.slug}`}>
                    <Button size="sm" className="mt-3">
                      Buy {r.fulfilledProduct.name}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
