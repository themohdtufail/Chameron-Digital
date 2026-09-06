/**
 * Confirms the file's actual bytes match its declared MIME type, on top of
 * the browser-supplied Content-Type check — a renamed/relabeled malicious
 * file (e.g. a script saved as "photo.jpg") won't match any signature below
 * and gets rejected before it ever reaches disk.
 *
 * Split out from storage.ts (which is server-only, touching the filesystem)
 * so this pure byte-matching logic can be unit tested directly.
 */
export function matchesFileSignature(buffer: Buffer, mimeType: string): boolean {
  const bytes = (...offsets: number[]) => offsets.map((o) => buffer[o]);

  switch (mimeType) {
    case "image/jpeg":
      return bytes(0, 1, 2).join(",") === "255,216,255";
    case "image/png":
      return bytes(0, 1, 2, 3).join(",") === "137,80,78,71";
    case "image/gif":
      return buffer.subarray(0, 4).toString("ascii") === "GIF8";
    case "image/webp":
      return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    case "video/webm":
      return bytes(0, 1, 2, 3).join(",") === "26,69,223,163";
    case "video/mp4":
    case "video/quicktime":
      // ISO base media (mp4/mov): a 4-byte box size, then an ASCII box type.
      // The first box is usually "ftyp"; some encoders emit "moov"/"free"/"wide" first.
      return ["ftyp", "moov", "free", "wide", "mdat", "skip"].includes(buffer.subarray(4, 8).toString("ascii"));
    default:
      return false;
  }
}
