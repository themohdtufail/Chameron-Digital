import { describe, it, expect } from "vitest";
import { matchesFileSignature } from "@/lib/file-signature";

function bytes(...values: number[]) {
  return Buffer.from(values);
}

describe("matchesFileSignature", () => {
  it("accepts a real JPEG header", () => {
    expect(matchesFileSignature(bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg")).toBe(true);
  });

  it("rejects a PNG header declared as a JPEG", () => {
    expect(matchesFileSignature(bytes(0x89, 0x50, 0x4e, 0x47), "image/jpeg")).toBe(false);
  });

  it("accepts a real PNG header", () => {
    expect(matchesFileSignature(bytes(0x89, 0x50, 0x4e, 0x47), "image/png")).toBe(true);
  });

  it("accepts a real GIF header", () => {
    expect(matchesFileSignature(Buffer.from("GIF89a"), "image/gif")).toBe(true);
  });

  it("accepts a real WEBP header (RIFF....WEBP)", () => {
    const buf = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]);
    expect(matchesFileSignature(buf, "image/webp")).toBe(true);
  });

  it("rejects a bare RIFF header without the WEBP tag as webp", () => {
    const buf = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("AVI ")]);
    expect(matchesFileSignature(buf, "image/webp")).toBe(false);
  });

  it("accepts an mp4 ftyp box", () => {
    const buf = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftyp"), Buffer.from("isom")]);
    expect(matchesFileSignature(buf, "video/mp4")).toBe(true);
  });

  it("rejects a text file pretending to be an image", () => {
    expect(matchesFileSignature(Buffer.from("<script>alert(1)</script>"), "image/jpeg")).toBe(false);
  });

  it("rejects an unrecognized declared MIME type outright", () => {
    expect(matchesFileSignature(bytes(0xff, 0xd8, 0xff), "application/octet-stream")).toBe(false);
  });

  it("does not throw on a buffer shorter than the signature it's checked against", () => {
    expect(() => matchesFileSignature(bytes(0xff), "image/jpeg")).not.toThrow();
    expect(matchesFileSignature(bytes(0xff), "image/jpeg")).toBe(false);
  });
});
