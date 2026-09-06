import { redirect } from "next/navigation";
import { Clock, XCircle, PauseCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function SellerPendingPage() {
  const user = await getCurrentUser();
  const store = await prisma.store.findUnique({ where: { ownerId: user!.id } });

  if (!store) redirect("/seller/register");
  if (store.status === "APPROVED") redirect("/seller/dashboard");

  const content = {
    PENDING: {
      icon: Clock,
      color: "text-accent-500 bg-accent-50",
      title: "Your store is under review",
      description: "Our team is reviewing your details. This usually takes less than 24 hours.",
    },
    REJECTED: {
      icon: XCircle,
      color: "text-danger-500 bg-danger-50",
      title: "Your application needs changes",
      description: store.rejectionReason || "Please contact support for details on what needs updating.",
    },
    SUSPENDED: {
      icon: PauseCircle,
      color: "text-zinc-500 bg-zinc-100",
      title: "Your store is suspended",
      description: "Please contact Chameron Digital support to resolve this.",
    },
  }[store.status as "PENDING" | "REJECTED" | "SUSPENDED"];

  const Icon = content.icon;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center bg-white px-6 text-center">
      <div className={`flex h-20 w-20 items-center justify-center rounded-3xl ${content.color}`}>
        <Icon className="h-9 w-9" />
      </div>
      <h1 className="mt-6 text-xl font-extrabold text-zinc-900">{content.title}</h1>
      <p className="mt-2 max-w-[320px] text-sm text-zinc-500">{content.description}</p>
      <p className="mt-6 text-sm font-semibold text-zinc-800">{store.name}</p>
      <div className="mt-10 w-full">
        <LogoutButton redirectTo="/seller/login" />
      </div>
    </main>
  );
}
