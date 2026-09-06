import { prisma } from "@/lib/db";
import { resolveCommissionPercentage } from "@/lib/pricing";

/** Fetches only the rules that could possibly apply to this store/category
 * (its own STORE rule, its business CATEGORY rule, and the GLOBAL rule),
 * then delegates the precedence decision to the pure resolver. */
export async function resolveCommissionForStore(storeId: string, categoryId: string | null) {
  const rules = await prisma.commissionRule.findMany({
    where: {
      OR: [
        { scope: "STORE", storeId },
        ...(categoryId ? [{ scope: "CATEGORY" as const, categoryId }] : []),
        { scope: "GLOBAL" },
      ],
    },
  });
  return resolveCommissionPercentage(rules, { storeId, categoryId });
}
