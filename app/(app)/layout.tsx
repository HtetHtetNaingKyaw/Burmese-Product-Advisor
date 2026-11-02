import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { MainNav } from "@/components/main-nav";
import { auth } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-bold text-stone-900"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white">
                  မြ
                </span>
                <span>ထုတ်ကုန် အကြံပေး</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="hidden max-w-56 truncate text-sm text-stone-600 sm:block"
                title={session.user.email}
              >
                {session.user.name || session.user.email}
              </span>
              <LogoutButton />
            </div>
          </div>

          <MainNav />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
