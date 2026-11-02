import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

function safeNext(value: string | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Validate the cookie here instead of trusting its presence in proxy.ts.
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/dashboard");
  }

  const { next } = await searchParams;

  return <AuthForm mode="login" redirectTo={safeNext(next) ?? "/dashboard"} />;
}
