"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AIInsightsCard() {
  const [state, setState] = useState<{ text: string } | { locked: true } | null>(null);

  useEffect(() => {
    fetch("/api/seller/ai/insights")
      .then(async (res) => {
        if (res.status === 403) return setState({ locked: true });
        const data = await res.json();
        if (res.ok) setState({ text: data.text });
      })
      .catch(() => {});
  }, []);

  if (!state) return null;

  return (
    <div className="mt-4 rounded-2xl border border-accent-100 bg-accent-50 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent-600" />
        <p className="text-sm font-bold text-accent-800">AI business insight</p>
      </div>
      {"locked" in state ? (
        <p className="mt-1.5 text-sm text-accent-700">
          Get AI-generated insights about your store&apos;s performance.{" "}
          <Link href="/seller/plans" className="font-semibold underline">
            Upgrade to Growth
          </Link>{" "}
          to unlock this.
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-accent-700">{state.text}</p>
      )}
    </div>
  );
}
