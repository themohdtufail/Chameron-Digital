import { describe, it, expect } from "vitest";
import { canUserReply, nextStatusOnUserReply, nextStatusOnAdminReply } from "@/lib/support";

describe("canUserReply", () => {
  it("allows replies on any status except CLOSED", () => {
    expect(canUserReply("OPEN")).toBe(true);
    expect(canUserReply("IN_PROGRESS")).toBe(true);
    expect(canUserReply("RESOLVED")).toBe(true);
  });

  it("rejects replies on a CLOSED ticket", () => {
    expect(canUserReply("CLOSED")).toBe(false);
  });
});

describe("nextStatusOnUserReply", () => {
  it("reopens a resolved ticket when the user replies", () => {
    expect(nextStatusOnUserReply("RESOLVED")).toBe("OPEN");
  });

  it("leaves OPEN and IN_PROGRESS unchanged", () => {
    expect(nextStatusOnUserReply("OPEN")).toBe("OPEN");
    expect(nextStatusOnUserReply("IN_PROGRESS")).toBe("IN_PROGRESS");
  });
});

describe("nextStatusOnAdminReply", () => {
  it("moves an open ticket to in-progress on the first admin reply", () => {
    expect(nextStatusOnAdminReply("OPEN")).toBe("IN_PROGRESS");
  });

  it("leaves IN_PROGRESS, RESOLVED, and CLOSED unchanged", () => {
    expect(nextStatusOnAdminReply("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(nextStatusOnAdminReply("RESOLVED")).toBe("RESOLVED");
    expect(nextStatusOnAdminReply("CLOSED")).toBe("CLOSED");
  });
});
