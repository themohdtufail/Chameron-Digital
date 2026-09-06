import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (user?.role === "BUYER") redirect("/buyer/home");
  if (user?.role === "SELLER") redirect("/seller/dashboard");
  if (user?.role === "ADMIN") redirect("/admin/dashboard");
  if (user?.role === "DELIVERY_PARTNER") redirect("/delivery/deliveries");
  redirect("/role");
}
