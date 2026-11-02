/**
 * End-to-end auth smoke test against a running dev server.
 *
 *   pnpm dev            (terminal 1)
 *   pnpm smoke:auth     (terminal 2)
 *
 * Exercises: proxy redirect → sign-up → session → sign-out.
 */
const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const origin = baseUrl;

const email = `smoke+${Date.now()}@example.com`;
const password = "burmese-advisor-1234";
const name = "စမ်းသပ် အသုံးပြုသူ";

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`, detail ?? "");
    process.exitCode = 1;
  }
}

async function main() {
  console.log(`Auth smoke test against ${baseUrl}\n`);

  // 1. Protected route redirects when unauthenticated (proxy.ts).
  const guarded = await fetch(`${baseUrl}/dashboard`, { redirect: "manual" });
  check(
    "unauthenticated /dashboard redirects to /login",
    guarded.status >= 300 && guarded.status < 400,
    guarded.status,
  );

  // A stale cookie must not bounce /login back to /dashboard (redirect loop).
  const stale = await fetch(`${baseUrl}/login`, {
    headers: { cookie: "better-auth.session_token=stale-token" },
    redirect: "manual",
  });
  check("stale cookie still renders /login", stale.status === 200, stale.status);

  // 2. Sign up.
  const signUp = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ name, email, password }),
  });
  const signUpBody = await signUp.json().catch(() => null);
  check("sign-up returns 200", signUp.ok, signUpBody);

  const cookie = signUp.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  check("sign-up sets a session cookie", cookie.length > 0);

  if (!cookie) return;

  // 3. Session is readable.
  const session = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: { cookie },
  });
  const sessionBody = (await session.json()) as {
    user?: { email?: string };
  } | null;
  check(
    "session belongs to the new user",
    sessionBody?.user?.email === email,
    sessionBody,
  );

  // 4. Protected route is now reachable.
  const dashboard = await fetch(`${baseUrl}/dashboard`, {
    headers: { cookie },
    redirect: "manual",
  });
  check("authenticated /dashboard returns 200", dashboard.status === 200, dashboard.status);

  // 5. Sign out.
  const signOut = await fetch(`${baseUrl}/api/auth/sign-out`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie, origin },
    body: "{}",
  });
  check("sign-out returns 200", signOut.ok, signOut.status);

  console.log(`\nCreated and removed: ${email}`);
}

main().catch((error) => {
  console.error(`\nSmoke test failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});

export {};
