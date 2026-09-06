import { prisma } from "@/lib/db";

/** Grouped catalog of every tunable the admin settings page renders — a
 * missing PlatformSetting row for a key means "use its default", so this
 * table only grows a row once an admin actually changes something. */
export const SETTINGS_CATALOG = [
  { key: "platform_name", label: "Platform name", group: "General", default: "Chameron Digital" },
  { key: "commission_default_percentage", label: "Default commission (%)", group: "Commerce", default: "10" },
  { key: "loyalty_rupees_per_point", label: "Rupees spent per loyalty point earned", group: "Loyalty", default: "100" },
  { key: "trial_days", label: "New seller trial length (days)", group: "Subscriptions", default: "14" },
] as const;

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key, String(fallback));
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

export async function setSetting(key: string, value: string, group = "general"): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value, group },
  });
}
