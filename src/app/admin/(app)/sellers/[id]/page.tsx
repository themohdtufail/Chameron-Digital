"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { ArrowLeft, ShieldCheck, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface StoreDoc {
  id: string;
  type: "SHOP_PROOF" | "GST" | "FSSAI" | "BUSINESS_CERTIFICATE";
  url: string;
  uploadedAt: string;
}

interface StoreDetail {
  id: string;
  name: string;
  city: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
  isVerified: boolean;
  owner: { name: string | null; phone: string; email: string | null };
  category: { name: string } | null;
  documents: StoreDoc[];
  _count: { products: number; orders: number };
}

const DOC_LABEL: Record<StoreDoc["type"], string> = {
  SHOP_PROOF: "Shop / business proof",
  GST: "GST certificate",
  FSSAI: "FSSAI license",
  BUSINESS_CERTIFICATE: "Business registration certificate",
};

const STATUS_TONE = {
  PENDING: "accent",
  UNDER_REVIEW: "accent",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "neutral",
} as const;

export default function AdminSellerDetailPage() {
  const params = useParams<{ id: string }>();
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/stores/${params.id}`, { cache: "no-store" });
    const data = await res.json();
    setStore(data.store ?? null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function updateStatus(status: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/stores/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Could not update store");
      return;
    }
    toast.success(`Store ${status.toLowerCase().replace("_", " ")}`);
    load();
  }

  async function toggleVerified() {
    if (!store) return;
    setBusy(true);
    const res = await fetch(`/api/admin/stores/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified: !store.isVerified }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Could not update verification");
      return;
    }
    toast.success(store.isVerified ? "Store unverified" : "Store verified");
    load();
  }

  if (!store) return <div className="p-6 text-center text-sm text-zinc-400">Loading…</div>;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/sellers">
          <ArrowLeft className="h-5 w-5 text-zinc-700" />
        </Link>
        <h1 className="text-xl font-extrabold text-zinc-900">{store.name}</h1>
        <Badge tone={STATUS_TONE[store.status]}>{store.status}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
          <h2 className="mb-2 text-sm font-bold text-zinc-900">Store</h2>
          <p className="text-sm text-zinc-600">{store.owner.name ?? store.owner.phone} · {store.owner.phone}</p>
          <p className="text-sm text-zinc-500">{store.city} · {store.category?.name ?? "Uncategorized"}</p>
          <p className="mt-1 text-xs text-zinc-400">
            {store._count.products} products · {store._count.orders} orders
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => updateStatus("UNDER_REVIEW")}>
              Mark under review
            </Button>
            <Button size="sm" disabled={busy} onClick={() => updateStatus("APPROVED")}>
              Approve
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => updateStatus("REJECTED")}>
              Reject
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => updateStatus("SUSPENDED")}>
              Suspend
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900">
              <ShieldCheck className={`h-4 w-4 ${store.isVerified ? "text-success-500" : "text-zinc-300"}`} />
              Verification badge
            </h2>
            <Button size="sm" variant={store.isVerified ? "outline" : "primary"} disabled={busy} onClick={toggleVerified}>
              {store.isVerified ? "Remove badge" : "Mark verified"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Review the uploaded documents below before granting the buyer-facing verified badge.
          </p>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
        <h2 className="mb-3 text-sm font-bold text-zinc-900">Uploaded documents</h2>
        {store.documents.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <FileText className="h-4 w-4" /> No documents uploaded yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {store.documents.map((doc) => (
              <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer" className="block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                  <Image src={doc.url} alt={DOC_LABEL[doc.type]} fill className="object-cover" />
                </div>
                <p className="mt-1 text-xs font-medium text-zinc-600">{DOC_LABEL[doc.type]}</p>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
