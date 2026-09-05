"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { ImagePlus, Loader2, X, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileUpload({
  value,
  onChange,
  folder,
  label,
  accept = "image/*",
  aspect = "aspect-square",
  isVideo,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: "stores" | "products" | "avatars";
  label: string;
  accept?: string;
  aspect?: string;
  isVideo?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-zinc-700">{label}</p>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50",
          aspect
        )}
      >
        {value ? (
          <>
            {isVideo ? (
              <video src={value} className="h-full w-full object-cover" muted />
            ) : (
              <Image src={value} alt="" fill className="object-cover" />
            )}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-zinc-400"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isVideo ? (
              <Video className="h-6 w-6" />
            ) : (
              <ImagePlus className="h-6 w-6" />
            )}
            <span className="text-xs font-medium">{uploading ? "Uploading..." : "Tap to upload"}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
