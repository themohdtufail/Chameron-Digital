"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { ImagePlus, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";

export function MultiImageUpload({
  images,
  onChange,
  max = 8,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, max - images.length)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "products");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        uploaded.push(data.url);
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-zinc-700">Product photos</p>
      {images.length > 1 && (
        <p className="mb-2 text-xs text-zinc-400">The first photo is used as the cover image. Use the arrows to reorder.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {images.map((url, idx) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-zinc-200">
            <Image src={url} alt="" fill className="object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, i) => i !== idx))}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-3 w-3" />
            </button>
            {images.length > 1 && (
              <div className="absolute inset-x-0 bottom-1 flex justify-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  disabled={idx === images.length - 1}
                  onClick={() => move(idx, 1)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-400"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-[10px] font-medium">Add</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
