import { isWithinBusinessHours } from "@/lib/utils";

interface StoreHoursRow {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

interface StoreOpenInput {
  isManuallyClosed: boolean;
  openingTime: string;
  closingTime: string;
  vacationMode?: boolean;
  vacationUntil?: Date | string | null;
  hours?: StoreHoursRow[];
}

/**
 * Whether a store is open right now. Prefers a per-day StoreHours row for
 * today when the seller has configured one; falls back to the legacy
 * openingTime/closingTime scalars (used by seed data and stores that never
 * set explicit hours) so nothing breaks for stores without StoreHours rows.
 */
export function isStoreOpen(store: StoreOpenInput, now = new Date()) {
  if (store.isManuallyClosed) return false;

  if (store.vacationMode) {
    if (!store.vacationUntil) return false;
    if (now < new Date(store.vacationUntil)) return false;
  }

  const todayHours = store.hours?.find((h) => h.dayOfWeek === now.getDay());
  if (todayHours) {
    if (todayHours.isClosed) return false;
    if (todayHours.openTime && todayHours.closeTime) {
      return isWithinBusinessHours(todayHours.openTime, todayHours.closeTime, now);
    }
  }

  return isWithinBusinessHours(store.openingTime, store.closingTime, now);
}
