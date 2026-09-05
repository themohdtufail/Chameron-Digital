import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SellerBottomNav } from "@/components/seller/SellerBottomNav";

export default async function SellerAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const store = await prisma.store.findUnique({ where: { ownerId: user!.id } });

  if (!store) redirect("/seller/register");
  if (store.status !== "APPROVED") redirect("/seller/pending");

  return (
    <div className="app-shell relative pb-20">
      {children}
      <SellerBottomNav />
    </div>
  );
}
