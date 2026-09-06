import { prisma } from "@/lib/db";
import { resolveCommissionPercentage, DEFAULT_COMMISSION_PERCENTAGE } from "@/lib/pricing";
import { getSettingNumber } from "@/lib/settings";

/** Fetches only the rules that could possibly apply to this store/category
 * (its own STORE rule, its business CATEGORY rule, and the GLOBAL rule),
 * then delegates the precedence decision to the pure resolver. The
 * fallback-of-fallback (no GLOBAL rule either) reads the admin-configurable
 * PlatformSetting, itself defaulting to the hardcoded constant. */
export async function resolveCommissionForStore(storeId: string, categoryId: string | null) {
  const [rules, defaultPercentage] = await Promise.all([
    prisma.commissionRule.findMany({
      where: {
        OR: [
          { scope: "STORE", storeId },
          ...(categoryId ? [{ scope: "CATEGORY" as const, categoryId }] : []),
          { scope: "GLOBAL" },
        ],
      },
    }),
    getSettingNumber("commission_default_percentage", DEFAULT_COMMISSION_PERCENTAGE),
  ]);
  return resolveCommissionPercentage(rules, { storeId, categoryId }, defaultPercentage);
}
