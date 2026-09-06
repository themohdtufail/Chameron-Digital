import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

// Integration test: exercises the real RateLimitHit table against the local
// dev Postgres database (DATABASE_URL) that `npm run dev`/`prisma migrate`
// already require. Uses a dedicated action name and cleans up after itself
// so it never interferes with real usage data.
const TEST_ACTION = "vitest_rate_limit_probe";
const TEST_IDENTIFIER = "vitest-user";

afterAll(async () => {
  await prisma.rateLimitHit.deleteMany({ where: { action: TEST_ACTION } });
  await prisma.$disconnect();
});

describe("enforceRateLimit", () => {
  it("allows requests under the limit and blocks once the limit is exceeded", async () => {
    const identifier = `${TEST_IDENTIFIER}-${Date.now()}`;
    const options = { windowSeconds: 3600, max: 3 };

    await enforceRateLimit(identifier, TEST_ACTION, options);
    await enforceRateLimit(identifier, TEST_ACTION, options);
    await enforceRateLimit(identifier, TEST_ACTION, options);

    await expect(enforceRateLimit(identifier, TEST_ACTION, options)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("tracks separate identifiers independently", async () => {
    const options = { windowSeconds: 3600, max: 1 };
    const a = `${TEST_IDENTIFIER}-a-${Date.now()}`;
    const b = `${TEST_IDENTIFIER}-b-${Date.now()}`;

    await enforceRateLimit(a, TEST_ACTION, options);
    // b has made no requests yet, so it should not be blocked by a's usage.
    await expect(enforceRateLimit(b, TEST_ACTION, options)).resolves.toBeUndefined();
    // a is now over its own limit.
    await expect(enforceRateLimit(a, TEST_ACTION, options)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("tracks separate actions independently for the same identifier", async () => {
    const identifier = `${TEST_IDENTIFIER}-${Date.now()}`;
    const options = { windowSeconds: 3600, max: 1 };

    await enforceRateLimit(identifier, `${TEST_ACTION}_a`, options);
    await expect(enforceRateLimit(identifier, `${TEST_ACTION}_b`, options)).resolves.toBeUndefined();

    await prisma.rateLimitHit.deleteMany({ where: { action: { in: [`${TEST_ACTION}_a`, `${TEST_ACTION}_b`] } } });
  });

  it("reports a positive retryAfterSeconds when blocked", async () => {
    const identifier = `${TEST_IDENTIFIER}-${Date.now()}`;
    const options = { windowSeconds: 3600, max: 1 };

    await enforceRateLimit(identifier, TEST_ACTION, options);
    try {
      await enforceRateLimit(identifier, TEST_ACTION, options);
      expect.unreachable("expected enforceRateLimit to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as InstanceType<typeof RateLimitError>).retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});
