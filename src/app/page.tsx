"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/Logo";

export default function SplashPage() {
  const router = useRouter();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function decideDestination() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        const minDelay = new Promise((resolve) => setTimeout(resolve, 1600));
        await minDelay;
        if (cancelled) return;

        setFading(true);
        setTimeout(() => {
          if (cancelled) return;
          if (data.user?.role === "BUYER") router.replace("/buyer/home");
          else if (data.user?.role === "SELLER") router.replace("/seller/dashboard");
          else if (data.user?.role === "ADMIN") router.replace("/admin/dashboard");
          else router.replace("/role");
        }, 250);
      } catch {
        if (cancelled) return;
        setTimeout(() => router.replace("/role"), 1600);
      }
    }

    decideDestination();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-600 to-brand-800">
      <div
        className={`flex flex-col items-center transition-opacity duration-300 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="animate-logo-pulse rounded-3xl bg-white/10 p-5 backdrop-blur">
          <LogoMark size={72} />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-white">
          Chameron Digital
        </h1>
        <p className="mt-2 text-sm font-medium text-brand-100">
          Your local market, now online
        </p>
        <div className="mt-10 flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80" />
        </div>
      </div>
    </main>
  );
}
