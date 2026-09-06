import { describe, it, expect } from "vitest";
import { canViewStoreDocuments } from "@/lib/documents";

describe("canViewStoreDocuments (KYC document access authorization)", () => {
  it("allows an admin to view any store's documents", () => {
    expect(
      canViewStoreDocuments({ role: "ADMIN", requesterUserId: "admin_1", storeOwnerId: "seller_1" })
    ).toBe(true);
  });

  it("allows a seller to view their own store's documents", () => {
    expect(
      canViewStoreDocuments({ role: "SELLER", requesterUserId: "seller_1", storeOwnerId: "seller_1" })
    ).toBe(true);
  });

  it("denies a seller viewing a different seller's documents (cross-seller IDOR)", () => {
    expect(
      canViewStoreDocuments({ role: "SELLER", requesterUserId: "seller_2", storeOwnerId: "seller_1" })
    ).toBe(false);
  });

  it("denies a buyer viewing any seller's KYC documents", () => {
    expect(
      canViewStoreDocuments({ role: "BUYER", requesterUserId: "buyer_1", storeOwnerId: "seller_1" })
    ).toBe(false);
  });

  it("denies a delivery partner viewing any seller's KYC documents", () => {
    expect(
      canViewStoreDocuments({ role: "DELIVERY_PARTNER", requesterUserId: "dp_1", storeOwnerId: "seller_1" })
    ).toBe(false);
  });
});
