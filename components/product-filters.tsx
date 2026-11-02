"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { btnSecondary, inputClass } from "@/lib/ui";

export function ProductFilters({
  categories,
  initialQ,
  initialCategory,
}: {
  categories: string[];
  initialQ: string;
  initialCategory: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);

  function apply(nextQ: string, nextCategory: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextCategory) params.set("category", nextCategory);
    const query = params.toString();
    startTransition(() => {
      router.push(`/dashboard/products${query ? `?${query}` : ""}`);
    });
  }

  const filtered = Boolean(initialQ || initialCategory);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply(q, category);
      }}
      className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center"
    >
      <label htmlFor="product-search" className="sr-only">
        ထုတ်ကုန် ရှာရန်
      </label>
      <input
        id="product-search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="ထုတ်ကုန် အမည်၊ ပါဝင်ပစ္စည်း စသည်ဖြင့် ရှာပါ…"
        maxLength={100}
        className={`${inputClass} sm:flex-1`}
      />

      <label htmlFor="product-category" className="sr-only">
        အမျိုးအစား စစ်ရန်
      </label>
      <select
        id="product-category"
        value={category}
        onChange={(event) => {
          setCategory(event.target.value);
          apply(q, event.target.value);
        }}
        className={`${inputClass} sm:w-52`}
      >
        <option value="">အမျိုးအစား အားလုံး</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <button type="submit" className={btnSecondary} disabled={pending}>
        {pending ? "ရှာနေသည်…" : "ရှာမည်"}
      </button>

      {filtered && (
        <button
          type="button"
          className="text-sm font-medium text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline"
          onClick={() => {
            setQ("");
            setCategory("");
            apply("", "");
          }}
        >
          ရှင်းလင်းရန်
        </button>
      )}
    </form>
  );
}
