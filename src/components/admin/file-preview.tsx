import { FileText } from "lucide-react";
import { fileUrl } from "@/lib/storage";

export function FilePreview({ fileKey, contentType }: { fileKey: string | null; contentType: string | null }) {
  if (!fileKey) return <div className="flex h-40 items-center justify-center rounded-2xl bg-surface-2 text-sm text-muted">No file</div>;
  const url = fileUrl(fileKey)!;
  if (contentType?.startsWith("image/") && !/hei[cf]/.test(contentType))
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Uploaded proof" className="max-h-80 w-full object-contain" loading="lazy" />
      </a>
    );
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-semibold text-brand hover:bg-surface-3"
    >
      <FileText className="size-8" />
      Open {contentType === "application/pdf" ? "PDF" : "file"}
    </a>
  );
}
