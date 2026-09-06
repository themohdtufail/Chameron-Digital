export type SupportTicketStatusValue = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

/** A closed ticket is archived — the user must wait for an admin to reopen it. */
export function canUserReply(status: SupportTicketStatusValue): boolean {
  return status !== "CLOSED";
}

/** A user reply on a resolved ticket means the issue isn't actually resolved — reopen it. */
export function nextStatusOnUserReply(status: SupportTicketStatusValue): SupportTicketStatusValue {
  return status === "RESOLVED" ? "OPEN" : status;
}

/** An admin's first reply signals the ticket is being worked, unless it's already further along. */
export function nextStatusOnAdminReply(status: SupportTicketStatusValue): SupportTicketStatusValue {
  return status === "OPEN" ? "IN_PROGRESS" : status;
}
