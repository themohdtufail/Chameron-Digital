"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function ReviewForm({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-2xl border border-success-50 bg-success-50 p-4 text-center text-sm font-semibold text-success-600">
        Thanks for your feedback!
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
      <p className="mb-2 text-sm font-bold text-zinc-900">Rate your experience</p>
      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}>
            <Star className={cn("h-7 w-7", n <= rating ? "fill-accent-400 text-accent-400" : "text-zinc-200")} />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Tell us about your experience (optional)"
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button
        className="mt-3"
        fullWidth
        loading={loading}
        disabled={rating === 0}
        onClick={async () => {
          setLoading(true);
          const res = await fetch("/api/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, rating, comment: comment || undefined }),
          });
          setLoading(false);
          if (!res.ok) {
            const data = await res.json();
            toast.error(data.error || "Could not submit review");
            return;
          }
          setSubmitted(true);
        }}
      >
        Submit review
      </Button>
    </div>
  );
}
