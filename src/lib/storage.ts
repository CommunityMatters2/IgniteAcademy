import "server-only";
import { del, get, put } from "@vercel/blob";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel Function bodies are capped at 4.5 MB
const ALLOWED = /^(image\/(jpeg|png|webp|heic|heif|gif)|application\/pdf)$/;

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const LOCAL_DIR = path.join(process.cwd(), ".uploads");

export class UploadError extends Error {}

export function validateUpload(file: File | null | undefined, { required = true } = {}) {
  if (!file || file.size === 0) {
    if (required) throw new UploadError("Please attach a photo or PDF.");
    return null;
  }
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("That file is too big (max 4 MB).");
  if (!ALLOWED.test(file.type)) throw new UploadError("Upload a photo (JPG/PNG/HEIC) or a PDF.");
  return file;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-60) || "file";
}

/**
 * Stores a file privately. Keys are namespaced so /api/files can authorize by prefix:
 *   u/{userId}/...   → owner + admins
 *   avatars/{userId}/... → any signed-in user
 */
export async function saveFile(file: File, key: string) {
  const fullKey = `${key}/${crypto.randomUUID().slice(0, 8)}-${safeName(file.name)}`;
  if (blobEnabled()) {
    const res = await put(fullKey, file, {
      access: "private",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return { key: res.pathname, contentType: file.type };
  }
  const target = path.join(LOCAL_DIR, fullKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  await writeFile(`${target}.type`, file.type);
  return { key: fullKey, contentType: file.type };
}

export async function readStoredFile(key: string) {
  if (blobEnabled()) {
    const res = await get(key, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream as ReadableStream, contentType: res.blob.contentType };
  }
  const target = path.join(LOCAL_DIR, key);
  if (!target.startsWith(LOCAL_DIR)) return null;
  try {
    const [buf, type] = await Promise.all([readFile(target), readFile(`${target}.type`, "utf8")]);
    return { body: new Uint8Array(buf), contentType: type };
  } catch {
    return null;
  }
}

export async function deleteStoredFile(key: string | null | undefined) {
  if (!key) return;
  try {
    if (blobEnabled()) await del(key);
    else {
      const target = path.join(LOCAL_DIR, key);
      if (target.startsWith(LOCAL_DIR)) await rm(target, { force: true });
    }
  } catch (err) {
    console.error("[storage] delete failed", err);
  }
}

export const fileUrl = (key: string | null | undefined) => (key ? `/api/files/${key}` : null);
