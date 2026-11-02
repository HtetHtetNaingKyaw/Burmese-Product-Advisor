import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Resolve the signed-in user from the Better Auth session cookie.
 *
 * Always use this on the server; never accept a user id from the client.
 * Wrapped in `cache` so a layout and its page share one lookup per request.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});
