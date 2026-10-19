import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PROTECTED = [
  "/home",
  "/school",
  "/help",
  "/awards",
  "/leaderboard",
  "/voice",
  "/forms",
  "/birthdays",
  "/me",
  "/notifications",
  "/welcome",
  "/admin",
];

/**
 * Optimistic redirect only (cookie presence). Every page, action and route handler
 * re-checks the real session and role via src/lib/session.ts.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  // Only the landing page shortcuts to the app. (Never /login: a stale cookie from a
  // revoked/paused session would otherwise bounce between /login and /home forever.)
  if (hasSession && pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|brand|icon|apple-icon|manifest|.*\.(?:png|jpg|svg|ico|webmanifest)$).*)"],
};
