import { isWithinBusinessHours } from "@/lib/utils";

export function isStoreOpen(store: { isManuallyClosed: boolean; openingTime: string; closingTime: string }) {
  if (store.isManuallyClosed) return false;
  return isWithinBusinessHours(store.openingTime, store.closingTime);
}
