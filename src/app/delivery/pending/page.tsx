import { redirect } from "next/navigation";
import { Clock, XCircle, PauseCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function DeliveryPendingPage() {
  const user = await getCurrentUser();
  const profile = await prisma.deliveryPartner.findUnique({ where: { userId: user!.id } });

  if (!profile) redirect("/delivery/register");
  if (profile.status === "APPROVED") redirect("/delivery/deliveries");

  const content = {
    PENDING: {
      icon: Clock,
      color: "text-accent-500 bg-accent-50",
      title: "Your application is under review",
      description: "Our team is reviewing your details. This usually takes less than 24 hours.",
    },
    REJECTED: {
      icon: XCircle,
      color: "text-danger-500 bg-danger-50",
      title: "Your application needs changes",
      description: profile.rejectionReason || "Please contact support for details on what needs updating.",
    },
    SUSPENDED: {
      icon: PauseCircle,
      color: "text-zinc-500 bg-zinc-100",
      title: "Your account is suspended",
      description: "Please contact Chameron Digital support to resolve this.",
    },
  }[profile.status as "PENDING" | "REJECTED" | "SUSPENDED"];

  const Icon = content.icon;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center bg-white px-6 text-center">
      <div className={`flex h-20 w-20 items-center justify-center rounded-3xl ${content.color}`}>
        <Icon className="h-9 w-9" />
      </div>
      <h1 className="mt-6 text-xl font-extrabold text-zinc-900">{content.title}</h1>
      <p className="mt-2 max-w-[320px] text-sm text-zinc-500">{content.description}</p>
      <div className="mt-10 w-full">
        <LogoutButton redirectTo="/delivery/login" />
      </div>
    </main>
  );
}
