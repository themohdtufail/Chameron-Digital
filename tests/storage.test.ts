import { describe, it, expect, afterEach, vi } from "vitest";
import { extensionForMimeType, isPrivateFolder, safeObjectFilename } from "@/lib/storage-keys";

describe("storage-keys (pure)", () => {
  it("maps validated MIME types to their real extension", () => {
    expect(extensionForMimeType("image/jpeg")).toBe(".jpg");
    expect(extensionForMimeType("image/png")).toBe(".png");
    expect(extensionForMimeType("image/webp")).toBe(".webp");
    expect(extensionForMimeType("image/gif")).toBe(".gif");
    expect(extensionForMimeType("video/mp4")).toBe(".mp4");
    expect(extensionForMimeType("video/webm")).toBe(".webm");
    expect(extensionForMimeType("video/quicktime")).toBe(".mov");
  });

  it("never derives an extension from an unrecognized/spoofed MIME type", () => {
    expect(extensionForMimeType("application/x-msdownload")).toBe("");
    expect(extensionForMimeType("text/html")).toBe("");
    expect(extensionForMimeType("")).toBe("");
  });

  it("only treats the documents folder as private", () => {
    expect(isPrivateFolder("documents")).toBe(true);
    expect(isPrivateFolder("products")).toBe(false);
    expect(isPrivateFolder("stores")).toBe(false);
    expect(isPrivateFolder("avatars")).toBe(false);
    expect(isPrivateFolder("reviews")).toBe(false);
    expect(isPrivateFolder("requests")).toBe(false);
  });

  it("generates a random, URL-safe filename with the correct extension and no user input", () => {
    const name = safeObjectFilename("image/png");
    expect(name).toMatch(/^[A-Za-z0-9_-]{20}\.png$/);
    // No path separators, no dot-dot, no way to escape the upload directory.
    expect(name).not.toMatch(/[./\\]{2,}/);
    expect(name.includes("/")).toBe(false);
    expect(name.includes("..")).toBe(false);
  });

  it("generates a different filename on every call (no collisions)", () => {
    const a = safeObjectFilename("image/jpeg");
    const b = safeObjectFilename("image/jpeg");
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Driver behavior — imports storage.ts itself (server-only is aliased to a
// no-op in vitest.config.mts so this resolves outside Next's bundler).
// ---------------------------------------------------------------------------

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe("getStorage provider selection", () => {
  afterEach(async () => {
    resetEnv();
    vi.resetModules();
  });

  it("defaults to the local driver when STORAGE_DRIVER is unset", async () => {
    delete process.env.STORAGE_DRIVER;
    const { getStorage } = await import("@/lib/storage");
    const storage = getStorage();
    // Local driver's isOwnReference recognizes its own "/uploads/..." shape.
    expect(storage.isOwnReference("/uploads/products/abc.jpg", "products")).toBe(true);
  });

  it("throws a clear config error for STORAGE_DRIVER=s3 with missing env vars, never falling back to local", async () => {
    process.env.STORAGE_DRIVER = "s3";
    delete process.env.S3_BUCKET;
    delete process.env.S3_REGION;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    const { getStorage, StorageConfigError } = await import("@/lib/storage");
    expect(() => getStorage()).toThrow(StorageConfigError);
    expect(() => getStorage()).toThrow(/S3_BUCKET/);
  });

  it("selects the S3 driver when STORAGE_DRIVER=s3 and all config is present", async () => {
    process.env.STORAGE_DRIVER = "s3";
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY_ID = "test-key";
    process.env.S3_SECRET_ACCESS_KEY = "test-secret";
    const { getStorage } = await import("@/lib/storage");
    const storage = getStorage();
    // S3 driver's isOwnReference recognizes the private-key / public-URL shapes, not local paths.
    expect(storage.isOwnReference("/uploads/products/abc.jpg", "products")).toBe(false);
    expect(storage.isOwnReference("public/products/abc.jpg", "products")).toBe(false); // missing base URL
    expect(storage.isOwnReference("https://test-bucket.s3.us-east-1.amazonaws.com/public/products/abc.jpg", "products")).toBe(
      true
    );
  });

  it("rejects a path-traversal or arbitrary-external-URL key masquerading as a document reference", async () => {
    process.env.STORAGE_DRIVER = "s3";
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY_ID = "test-key";
    process.env.S3_SECRET_ACCESS_KEY = "test-secret";
    const { getStorage } = await import("@/lib/storage");
    const storage = getStorage();

    expect(storage.isOwnReference("../../etc/passwd", "documents", "store_1")).toBe(false);
    expect(storage.isOwnReference("https://evil.example/malware.exe", "documents", "store_1")).toBe(false);
    // Scoped to a *different* store's own real key — must not be accepted as store_1's.
    expect(storage.isOwnReference("private/documents/store_2/real-object.jpg", "documents", "store_1")).toBe(false);
  });
});

describe("LocalStorageDriver (real filesystem, cleaned up after itself)", () => {
  afterEach(() => {
    resetEnv();
    vi.resetModules();
  });

  it("uploads, then retrieves via getSignedUrl (a no-op locally), then deletes", async () => {
    delete process.env.STORAGE_DRIVER;
    const { getStorage } = await import("@/lib/storage");
    const storage = getStorage();

    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG-ish bytes, content doesn't matter here
    const ref = await storage.upload(buffer, "image/jpeg", "products");

    expect(ref).toMatch(/^\/uploads\/products\/[A-Za-z0-9_-]{20}\.jpg$/);
    expect(await storage.getSignedUrl(ref, "products")).toBe(ref); // local: identity

    // Deleting a real, just-created file must succeed without throwing.
    await expect(storage.delete(ref, "products")).resolves.toBeUndefined();
  });

  it("does not throw when deleting a file that no longer exists (idempotent)", async () => {
    delete process.env.STORAGE_DRIVER;
    const { getStorage } = await import("@/lib/storage");
    const storage = getStorage();
    await expect(storage.delete("/uploads/products/does-not-exist.jpg", "products")).resolves.toBeUndefined();
  });
});

describe("S3StorageDriver (mocked AWS SDK — never touches a real bucket)", () => {
  afterEach(() => {
    resetEnv();
    vi.resetModules();
    vi.doUnmock("@aws-sdk/client-s3");
    vi.doUnmock("@aws-sdk/s3-request-presigner");
  });

  function setS3Env() {
    process.env.STORAGE_DRIVER = "s3";
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY_ID = "test-key";
    process.env.S3_SECRET_ACCESS_KEY = "test-secret";
  }

  it("uploads a public-folder object with the correct key/ContentType and returns a public URL", async () => {
    setS3Env();
    const send = vi.fn().mockResolvedValue({});
    class MockS3Client {
      send = send;
    }
    vi.doMock("@aws-sdk/client-s3", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
      return { ...actual, S3Client: MockS3Client };
    });

    const { getStorage } = await import("@/lib/storage");
    const ref = await getStorage().upload(Buffer.from("fake-image"), "image/png", "products");

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0];
    expect(command.input.Bucket).toBe("test-bucket");
    expect(command.input.Key).toMatch(/^public\/products\/[A-Za-z0-9_-]{20}\.png$/);
    expect(command.input.ContentType).toBe("image/png");
    expect(ref).toBe(`https://test-bucket.s3.us-east-1.amazonaws.com/${command.input.Key}`);
  });

  it("uploads a private-folder (documents/KYC) object scoped under the owner id and returns the raw key, not a URL", async () => {
    setS3Env();
    const send = vi.fn().mockResolvedValue({});
    class MockS3Client {
      send = send;
    }
    vi.doMock("@aws-sdk/client-s3", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
      return { ...actual, S3Client: MockS3Client };
    });

    const { getStorage } = await import("@/lib/storage");
    const ref = await getStorage().upload(Buffer.from("fake-pdf"), "image/png", "documents", "store_123");

    const command = send.mock.calls[0][0];
    expect(command.input.Key).toMatch(/^private\/documents\/store_123\/[A-Za-z0-9_-]{20}\.png$/);
    // The returned reference is the opaque key itself — never a directly-usable URL.
    expect(ref).toBe(command.input.Key);
    expect(ref.startsWith("https://")).toBe(false);
  });

  it("propagates upload failures rather than returning a fake success reference", async () => {
    setS3Env();
    const send = vi.fn().mockRejectedValue(new Error("network error"));
    class MockS3Client {
      send = send;
    }
    vi.doMock("@aws-sdk/client-s3", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
      return { ...actual, S3Client: MockS3Client };
    });

    const { getStorage, StorageOperationError } = await import("@/lib/storage");
    await expect(getStorage().upload(Buffer.from("x"), "image/png", "products")).rejects.toBeInstanceOf(
      StorageOperationError
    );
  });

  it("deletes a public object by recovering its key from the stored public URL", async () => {
    setS3Env();
    const send = vi.fn().mockResolvedValue({});
    class MockS3Client {
      send = send;
    }
    vi.doMock("@aws-sdk/client-s3", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
      return { ...actual, S3Client: MockS3Client };
    });

    const { getStorage } = await import("@/lib/storage");
    await getStorage().delete("https://test-bucket.s3.us-east-1.amazonaws.com/public/products/abc123.jpg", "products");

    const command = send.mock.calls[0][0];
    expect(command.input.Bucket).toBe("test-bucket");
    expect(command.input.Key).toBe("public/products/abc123.jpg");
  });

  it("propagates delete failures rather than reporting a false success", async () => {
    setS3Env();
    const send = vi.fn().mockRejectedValue(new Error("access denied"));
    class MockS3Client {
      send = send;
    }
    vi.doMock("@aws-sdk/client-s3", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
      return { ...actual, S3Client: MockS3Client };
    });

    const { getStorage, StorageOperationError } = await import("@/lib/storage");
    await expect(getStorage().delete("private/documents/store_1/abc.jpg", "documents")).rejects.toBeInstanceOf(
      StorageOperationError
    );
  });

  it("generates a short-lived signed URL for a private document and never for a public object", async () => {
    setS3Env();
    class MockS3Client {
      send = vi.fn();
    }
    vi.doMock("@aws-sdk/client-s3", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
      return { ...actual, S3Client: MockS3Client };
    });
    const presign = vi.fn().mockResolvedValue("https://signed.example/private/documents/store_1/abc.jpg?X-Amz-Expires=900");
    vi.doMock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: presign }));

    const { getStorage } = await import("@/lib/storage");
    const url = await getStorage().getSignedUrl("private/documents/store_1/abc.jpg", "documents");

    expect(presign).toHaveBeenCalledTimes(1);
    expect(presign.mock.calls[0][2]).toEqual({ expiresIn: 900 });
    expect(url).toContain("X-Amz-Expires=900");

    // A public folder's ref is already a usable URL — no signing call needed.
    const publicRef = "https://test-bucket.s3.us-east-1.amazonaws.com/public/products/abc.jpg";
    const resolved = await getStorage().getSignedUrl(publicRef, "products");
    expect(resolved).toBe(publicRef);
    expect(presign).toHaveBeenCalledTimes(1); // still just the one call from above
  });
});
