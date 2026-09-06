import { User, MapPin, Phone, Mail, Store, ShieldCheck, Heart, Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BuyerProfilePage() {
  const user = await getCurrentUser();
  const addresses = await prisma.location.findMany({
    where: { userId: user!.id },
    orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="animate-fade-in mx-auto max-w-2xl px-4 py-5 lg:px-8 lg:py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
          <User className="h-6 w-6 text-brand-600" />
        </div>
        <div>
          <p className="text-lg font-extrabold text-zinc-900">{user!.name ?? "Buyer"}</p>
          <p className="text-sm text-zinc-500">Member of Chameron Digital</p>
        </div>
      </div>

      <div className="mt-6 space-y-2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
        <InfoRow icon={Phone} label={user!.phone} />
        {user!.email && <InfoRow icon={Mail} label={user!.email} />}
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-900">
          <MapPin className="h-4 w-4 text-brand-600" /> Saved addresses
        </p>
        {addresses.length === 0 ? (
          <p className="text-sm text-zinc-400">No saved addresses yet.</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {addresses.map((a) => (
              <div key={a.id} className="py-2 text-sm">
                <p className="font-semibold text-zinc-800">{a.label}</p>
                <p className="text-zinc-500">
                  {[a.addressLine, a.area, a.city, a.state].filter(Boolean).join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:hidden">
        <Link
          href="/buyer/wishlist"
          className="flex items-center gap-2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card"
        >
          <Heart className="h-4 w-4 text-danger-500" />
          <span className="text-sm font-semibold text-zinc-800">Wishlist</span>
        </Link>
        <Link
          href="/buyer/notifications"
          className="flex items-center gap-2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card"
        >
          <Bell className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-semibold text-zinc-800">Notifications</span>
        </Link>
      </div>

      <Link
        href="/role"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card"
      >
        <Store className="h-4 w-4 text-accent-600" />
        <span className="text-sm font-semibold text-zinc-800">Switch to selling on Chameron Digital</span>
      </Link>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-500">
        <ShieldCheck className="h-4 w-4 shrink-0 text-zinc-400" />
        Your account is protected with mobile OTP verification.
      </div>

      <div className="mt-6">
        <LogoutButton redirectTo="/buyer/login" />
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label }: { icon: typeof Phone; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-700">
      <Icon className="h-4 w-4 text-zinc-400" /> {label}
    </div>
  );
}
