import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DeliveryBottomNav } from "@/components/delivery/DeliveryBottomNav";
import { DeliveryDesktopSidebar } from "@/components/delivery/DeliveryDesktopSidebar";

export default async function DeliveryAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const profile = await prisma.deliveryPartner.findUnique({ where: { userId: user!.id } });

  if (!profile) redirect("/delivery/register");
  if (profile.status !== "APPROVED") redirect("/delivery/pending");

  return (
    <div className="app-shell relative pb-20 lg:flex lg:pb-0">
      <DeliveryDesktopSidebar name={user!.name} />
      <div className="min-w-0 flex-1">{children}</div>
      <DeliveryBottomNav />
    </div>
  );
}
