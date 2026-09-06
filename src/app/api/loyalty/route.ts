import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  const user = await requireUser();
  const account = await prisma.loyaltyAccount.findUnique({ where: { userId: user.id } });
  const transactions = account
    ? await prisma.loyaltyTransaction.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  return NextResponse.json({ pointsBalance: account?.pointsBalance ?? 0, transactions });
});
