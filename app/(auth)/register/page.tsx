import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/dashboard");
  }

  return <AuthForm mode="register" />;
}
