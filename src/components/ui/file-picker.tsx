"use client";

import { useRef, useState } from "react";
import { Camera, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_DIM = 2000;
const TARGET_BYTES = 1.5 * 1024 * 1024;

/** Downscales big phone photos to keep uploads fast and under the 4 MB limit. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < TARGET_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // e.g. HEIC on browsers that can't decode it — upload as-is
  }
}

export function FilePicker({
  name,
  label = "Add photo or PDF",
  hint = "Snap a photo or choose a file · max 4 MB",
  required,
  accept = "image/*,application/pdf",
  compact,
}: {
  name: string;
  label?: string;
  hint?: string;
  required?: boolean;
  accept?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string | null; name: string; size: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return setPreview(null);
    setBusy(true);
    const file = await compressImage(original);
    if (file !== original) {
      const dt = new DataTransfer();
      dt.items.add(file);
      e.target.files = dt.files;
    }
    setPreview({
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      name: file.name,
      size: file.size,
    });
    setBusy(false);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={`file-${name}`}
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={onChange}
        className="sr-only"
      />
      {preview ? (
        <div className="flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand-soft p-3">
          {preview.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="" className="size-16 rounded-xl object-cover" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-xl bg-surface-2">
              <FileText className="size-7 text-brand" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{preview.name}</p>
            <p className="text-xs text-muted">{(preview.size / 1024 / 1024).toFixed(1)} MB · ready</p>
          </div>
          <button type="button" onClick={clear} className="rounded-full p-2 hover:bg-surface-2" aria-label="Remove file">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={`file-${name}`}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-2 text-center transition-colors hover:border-brand hover:bg-brand-soft",
            compact ? "py-5" : "py-8",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-brand text-brand-fg">
            <Camera className="size-5" />
          </span>
          <span className="text-sm font-semibold">{busy ? "Optimizing…" : label}</span>
          <span className="text-xs text-muted">{hint}</span>
        </label>
      )}
    </div>
  );
}
