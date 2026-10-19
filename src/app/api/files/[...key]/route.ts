import { getSession } from "@/lib/session";
import { readStoredFile } from "@/lib/storage";

/**
 * Serves private uploads after checking access:
 *   avatars/{userId}/…  → any signed-in user
 *   u/{userId}/…        → that user, or an admin
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.map(decodeURIComponent).join("/");
  if (key.includes("..")) return new Response("Bad request", { status: 400 });

  const s = await getSession();
  if (!s) return new Response("Unauthorized", { status: 401 });

  const isAdmin = s.user.role === "admin";
  const [scope, owner] = key.split("/");
  const allowed =
    (scope === "avatars") || (scope === "u" && (owner === s.user.id || isAdmin)) || (scope === "badges");
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const file = await readStoredFile(key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
