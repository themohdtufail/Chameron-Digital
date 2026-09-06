import type { Role } from "@prisma/client";

/**
 * Pure authorization predicate for viewing a store's KYC/verification
 * documents. Kept separate from the Prisma-backed routes that call it so
 * the actual security rule — admin sees any store's documents, a seller
 * sees only their own store's, nobody else sees any — is unit-testable
 * without a database (buyers, other sellers, and unauthenticated requests
 * must all come back false).
 */
export function canViewStoreDocuments(params: { role: Role; requesterUserId: string; storeOwnerId: string }): boolean {
  if (params.role === "ADMIN") return true;
  if (params.role === "SELLER") return params.requesterUserId === params.storeOwnerId;
  return false;
}
