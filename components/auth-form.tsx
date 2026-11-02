"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const copy = {
  login: {
    title: "အကောင့်ဝင်ရန်",
    subtitle: "သင့်အကောင့်ဖြင့် ဆက်လက်အသုံးပြုပါ",
    submit: "ဝင်ရန်",
    pending: "ဝင်နေသည်…",
    altText: "အကောင့်မရှိသေးပါဘူးလား?",
    altLink: "အကောင့်အသစ်ဖွင့်ရန်",
    altHref: "/register",
    error: "အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားနေပါသည်။",
  },
  register: {
    title: "အကောင့်အသစ်ဖွင့်ရန်",
    subtitle: "နာမည်၊ အီးမေးလ်နှင့် စကားဝှက်ဖြင့် စတင်ပါ",
    submit: "အကောင့်ဖွင့်ရန်",
    pending: "ဖွင့်နေသည်…",
    altText: "အကောင့်ရှိပြီးသားလား?",
    altLink: "ဝင်ရန်",
    altHref: "/login",
    error: "အကောင့်ဖွင့်၍ မရပါ။ အီးမေးလ် ထပ်မံစစ်ဆေးပါ။",
  },
} as const;

export function AuthForm({
  mode,
  redirectTo = "/dashboard",
}: {
  mode: "login" | "register";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const text = copy[mode];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    const result =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name });

    if (result.error) {
      setError(text.error);
      setPending(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-xl shadow-stone-900/5 backdrop-blur sm:p-8">
      <h2 className="text-xl font-semibold text-stone-900">{text.title}</h2>
      <p className="mt-1 text-sm text-stone-600">{text.subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "register" && (
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              အမည်
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="ဥပမာ — မောင်မောင်"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-stone-700"
          >
            အီးမေးလ်
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-stone-700"
          >
            စကားဝှက်
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="အနည်းဆုံး ၈ လုံး"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-amber-600 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-700 focus:ring-2 focus:ring-amber-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? text.pending : text.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-600">
        {text.altText}{" "}
        <Link
          href={text.altHref}
          className="font-semibold text-amber-700 hover:underline"
        >
          {text.altLink}
        </Link>
      </p>
    </div>
  );
}
