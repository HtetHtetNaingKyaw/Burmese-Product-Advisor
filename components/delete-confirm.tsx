"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnDanger, btnSecondary } from "@/lib/ui";

export function DeleteConfirm({
  endpoint,
  message,
  redirectTo,
}: {
  endpoint: string;
  message: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "ဖျက်၍ မရပါ။ ထပ်စမ်းပါ။");
        setPending(false);
        return;
      }

      setOpen(false);
      setPending(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      setError("ကွန်ရက် အမှား ဖြစ်ပေါ်နေပါသည်။");
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={btnDanger} onClick={() => setOpen(true)}>
        ဖျက်ရန်
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">{message}</p>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnDanger}
          onClick={remove}
          disabled={pending}
        >
          {pending ? "ဖျက်နေသည်…" : "ဟုတ်ကဲ့၊ ဖျက်ပါ"}
        </button>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
        >
          မလုပ်တော့ပါ
        </button>
      </div>
    </div>
  );
}
