"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Megaphone, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function MarketingContentGenerator() {
  const [occasion, setOccasion] = useState("");
  const [highlight, setHighlight] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/ai/marketing-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: occasion || undefined, highlight: highlight || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate content");
      setResult(data.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900">
        <Megaphone className="h-4 w-4 text-brand-600" /> AI marketing message
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Occasion (e.g. Diwali)" value={occasion} onChange={(e) => setOccasion(e.target.value)} />
        <Input placeholder="Highlight (e.g. 20% off)" value={highlight} onChange={(e) => setHighlight(e.target.value)} />
      </div>
      <Button size="sm" loading={loading} onClick={generate} className="mt-3">
        Generate
      </Button>
      {result && (
        <div className="mt-3 flex items-start justify-between gap-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
          <p>{result}</p>
          <button onClick={copy} className="shrink-0 text-zinc-400 hover:text-zinc-700">
            <Copy className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
