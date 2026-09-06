"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { AuthOtpForm } from "@/components/auth/AuthOtpForm";

export default function DeliveryLoginPage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white px-6 pb-10 pt-8">
      <Link href="/role" className="flex items-center gap-1 text-sm font-medium text-zinc-500">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-8 flex flex-col items-center text-center">
        <LogoMark size={48} />
        <h1 className="mt-4 text-xl font-extrabold text-zinc-900">Deliver with us 🚚</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Log in with your mobile number to manage your deliveries.
        </p>
      </div>

      <div className="mt-8">
        <AuthOtpForm
          role="DELIVERY_PARTNER"
          tagline="We'll text you a one-time code to verify your number."
          onSuccess={(user) => {
            if (!user.hasDeliveryProfile) {
              router.replace("/delivery/register");
            } else if (user.deliveryPartnerStatus === "APPROVED") {
              router.replace("/delivery/deliveries");
            } else {
              router.replace("/delivery/pending");
            }
          }}
        />
      </div>
    </main>
  );
}
