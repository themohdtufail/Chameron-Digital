import Link from "next/link";
import { ArrowLeft, Gift, Plus, Minus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RUPEES_PER_POINT_EARNED, RUPEES_PER_POINT_REDEEMED } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  EARNED: "Earned",
  REDEEMED: "Redeemed",
  REFUNDED: "Refunded",
  ADJUSTED: "Adjusted",
};

export default async function BuyerLoyaltyPage() {
  const user = await getCurrentUser();
  const account = await prisma.loyaltyAccount.findUnique({ where: { userId: user!.id } });
  const transactions = account
    ? await prisma.loyaltyTransaction.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    : [];

  return (
    <div className="animate-fade-in pb-10">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur">
        <Link href="/buyer/profile">
          <ArrowLeft className="h-5 w-5 text-zinc-700" />
        </Link>
        <h1 className="text-lg font-extrabold text-zinc-900">Loyalty points</h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <div className="rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-medium opacity-90">
            <Gift className="h-4 w-4" /> Your balance
          </div>
          <p className="mt-2 text-4xl font-extrabold">{account?.pointsBalance ?? 0}</p>
          <p className="mt-1 text-xs opacity-80">
            Worth ₹{((account?.pointsBalance ?? 0) * RUPEES_PER_POINT_REDEEMED).toLocaleString("en-IN")} off your next order
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-4 text-sm text-zinc-500 shadow-card">
          Earn 1 point for every ₹{RUPEES_PER_POINT_EARNED} you spend, credited when your order is delivered. Redeem
          points at checkout for ₹{RUPEES_PER_POINT_REDEEMED} off per point.
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white shadow-card">
          <p className="border-b border-zinc-100 px-4 py-3 text-sm font-bold text-zinc-900">History</p>
          {transactions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">No activity yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    {t.points >= 0 ? (
                      <Plus className="h-3.5 w-3.5 text-success-500" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-danger-500" />
                    )}
                    <div>
                      <p className="font-medium text-zinc-800">{TYPE_LABEL[t.type] ?? t.type}</p>
                      <p className="text-xs text-zinc-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${t.points >= 0 ? "text-success-600" : "text-danger-600"}`}>
                    {t.points >= 0 ? "+" : ""}
                    {t.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
