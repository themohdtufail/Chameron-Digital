import { describe, it, expect } from "vitest";
import { isStoreOpen } from "@/lib/store-helpers";

const WEDNESDAY_NOON = new Date("2026-09-09T12:00:00"); // a Wednesday, local time
const WEDNESDAY_LATE_NIGHT = new Date("2026-09-09T23:00:00");

describe("isStoreOpen", () => {
  it("is open within the default scalar hours when there are no StoreHours rows", () => {
    const store = { isManuallyClosed: false, openingTime: "09:00", closingTime: "21:00" };
    expect(isStoreOpen(store, WEDNESDAY_NOON)).toBe(true);
  });

  it("is closed outside the default scalar hours", () => {
    const store = { isManuallyClosed: false, openingTime: "09:00", closingTime: "21:00" };
    expect(isStoreOpen(store, WEDNESDAY_LATE_NIGHT)).toBe(false);
  });

  it("is always closed when manually closed, regardless of hours", () => {
    const store = { isManuallyClosed: true, openingTime: "00:00", closingTime: "23:59" };
    expect(isStoreOpen(store, WEDNESDAY_NOON)).toBe(false);
  });

  it("prefers today's StoreHours row over the default scalar hours", () => {
    const store = {
      isManuallyClosed: false,
      openingTime: "09:00",
      closingTime: "21:00",
      hours: [{ dayOfWeek: WEDNESDAY_NOON.getDay(), isClosed: false, openTime: "13:00", closeTime: "22:00" }],
    };
    // Noon is within the default hours but before this day's overridden opening time.
    expect(isStoreOpen(store, WEDNESDAY_NOON)).toBe(false);
  });

  it("treats an explicit isClosed StoreHours row as closed even within default hours", () => {
    const store = {
      isManuallyClosed: false,
      openingTime: "09:00",
      closingTime: "21:00",
      hours: [{ dayOfWeek: WEDNESDAY_NOON.getDay(), isClosed: true, openTime: null, closeTime: null }],
    };
    expect(isStoreOpen(store, WEDNESDAY_NOON)).toBe(false);
  });

  it("falls back to default hours for a day with no StoreHours row", () => {
    const otherDay = (WEDNESDAY_NOON.getDay() + 1) % 7;
    const store = {
      isManuallyClosed: false,
      openingTime: "09:00",
      closingTime: "21:00",
      hours: [{ dayOfWeek: otherDay, isClosed: true, openTime: null, closeTime: null }],
    };
    expect(isStoreOpen(store, WEDNESDAY_NOON)).toBe(true);
  });

  it("is closed during vacation mode with no end date", () => {
    const store = { isManuallyClosed: false, openingTime: "09:00", closingTime: "21:00", vacationMode: true, vacationUntil: null };
    expect(isStoreOpen(store, WEDNESDAY_NOON)).toBe(false);
  });

  it("is closed during vacation mode with a future end date", () => {
    const store = {
      isManuallyClosed: false,
      openingTime: "09:00",
      closingTime: "21:00",
      vacationMode: true,
      vacationUntil: new Date(WEDNESDAY_NOON.getTime() + 86400000),
    };
    expect(isStoreOpen(store, WEDNESDAY_NOON)).toBe(false);
  });

  it("resumes normal hours once vacation mode's end date has passed", () => {
    const store = {
      isManuallyClosed: false,
      openingTime: "09:00",
      closingTime: "21:00",
      vacationMode: true,
      vacationUntil: new Date(WEDNESDAY_NOON.getTime() - 86400000),
    };
    expect(isStoreOpen(store, WEDNESDAY_NOON)).toBe(true);
  });
});
