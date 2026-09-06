"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";
import { FileUpload } from "@/components/seller/FileUpload";

interface StoreDoc {
  id: string;
  type: "SHOP_PROOF" | "GST" | "FSSAI" | "BUSINESS_CERTIFICATE";
  url: string;
}

const DOC_TYPES: { type: StoreDoc["type"]; label: string }[] = [
  { type: "SHOP_PROOF", label: "Shop / business proof" },
  { type: "GST", label: "GST certificate" },
  { type: "FSSAI", label: "FSSAI license (food businesses)" },
  { type: "BUSINESS_CERTIFICATE", label: "Business registration certificate" },
];

export default function SellerVerificationPage() {
  const [documents, setDocuments] = useState<StoreDoc[] | null>(null);
  const [store, setStore] = useState<{ status: string; isVerified: boolean } | null>(null);

  async function load() {
    const [docsRes, storeRes] = await Promise.all([fetch("/api/seller/documents"), fetch("/api/seller/store")]);
    const docsData = await docsRes.json();
    const storeData = await storeRes.json();
    setDocuments(docsData.documents ?? []);
    setStore(storeData.store ? { status: storeData.store.status, isVerified: storeData.store.isVerified } : null);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(type: StoreDoc["type"], url: string | null) {
    const existing = documents?.find((d) => d.type === type);
    if (existing) {
      await fetch(`/api/seller/documents/${existing.id}`, { method: "DELETE" });
    }
    if (url) {
      const res = await fetch("/api/seller/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, key: url }),
      });
      if (!res.ok) {
        toast.error("Could not save document");
        return;
      }
      toast.success("Document uploaded");
    }
    load();
  }

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 lg:text-2xl">Store verification</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Upload your business documents so our team can verify your store. Verified stores get a trust badge
            buyers can see.
          </p>
        </div>

        {store && (
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
            <ShieldCheck className={`h-5 w-5 ${store.isVerified ? "text-success-500" : "text-zinc-300"}`} />
            <p className="text-sm font-semibold text-zinc-800">
              {store.isVerified ? "Your store is verified" : "Not verified yet"}
            </p>
          </div>
        )}

        {documents && (
          <div className="grid grid-cols-2 gap-4">
            {DOC_TYPES.map((d) => {
              const existing = documents.find((doc) => doc.type === d.type);
              return (
                <FileUpload
                  key={d.type}
                  label={d.label}
                  value={existing?.url ?? null}
                  onChange={(url) => handleUpload(d.type, url)}
                  folder="documents"
                  aspect="aspect-[4/3]"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
