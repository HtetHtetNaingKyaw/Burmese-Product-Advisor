import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/products", "/chat"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = Boolean(getSessionCookie(request));

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Never bounce an existing cookie away from /login or /register. The cookie
  // may be stale (expired session, reset database), and only the server can
  // validate it. The auth pages do that check themselves.
  return NextResponse.next();
}

// Optimistic check only; real authorization happens at the data layer.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$).*)",
  ],
};
