"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/field";
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  textareaClass,
} from "@/lib/ui";

export type ProductValues = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  ingredients: string | null;
  price: number | null;
  benefits: string | null;
  uniqueSellingPoints: string | null;
  targetCustomers: string | null;
};

export function ProductForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: ProductValues;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const cancelHref =
    mode === "edit" && initial
      ? `/dashboard/products/${initial.id}`
      : "/dashboard/products";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? ""),
      price: String(formData.get("price") ?? ""),
      description: String(formData.get("description") ?? ""),
      ingredients: String(formData.get("ingredients") ?? ""),
      benefits: String(formData.get("benefits") ?? ""),
      uniqueSellingPoints: String(formData.get("uniqueSellingPoints") ?? ""),
      targetCustomers: String(formData.get("targetCustomers") ?? ""),
    };

    try {
      const endpoint =
        mode === "edit" && initial
          ? `/api/products/${initial.id}`
          : "/api/products";
      const response = await fetch(endpoint, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          fieldErrors?: Record<string, string>;
        } | null;
        setFormError(body?.error ?? "သိမ်း၍ မရပါ။ ထပ်စမ်းပါ။");
        setFieldErrors(body?.fieldErrors ?? {});
        setPending(false);
        return;
      }

      const body = (await response.json()) as {
        product?: { id?: string };
      };
      const id = body.product?.id ?? initial?.id;
      if (id) router.push(`/dashboard/products/${id}`);
      else router.push("/dashboard/products");
      router.refresh();
    } catch {
      setFormError("ကွန်ရက် အမှား ဖြစ်ပေါ်နေပါသည်။");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-stone-900">
          {mode === "create" ? "ထုတ်ကုန် အသစ် ထည့်ရန်" : "ထုတ်ကုန် ပြင်ဆင်ရန်"}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          ဖြည့်နိုင်သမျှ ဖြည့်ပါ။ အကြံပြုချက် အရည်အသွေး ပိုကောင်းလာပါမည်။
        </p>
      </div>

      {formError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {formError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="name"
          label="ထုတ်ကုန် အမည်"
          required
          error={fieldErrors.name}
        >
          <input
            id="name"
            name="name"
            required
            maxLength={160}
            defaultValue={initial?.name ?? ""}
            placeholder="ဥပမာ — ရွှေမိုး လက်ဖက်ရည် ထုပ်"
            className={inputClass}
          />
        </Field>

        <Field
          id="category"
          label="အမျိုးအစား"
          hint="ဥပမာ — အစားအသောက်၊ အလှကုန်၊ လက်မှုပစ္စည်း"
          error={fieldErrors.category}
        >
          <input
            id="category"
            name="category"
            maxLength={80}
            defaultValue={initial?.category ?? ""}
            className={inputClass}
          />
        </Field>

        <Field
          id="price"
          label="ဈေးနှုန်း (ကျပ်)"
          hint="ကိန်းပြည့် ဂဏန်းဖြင့် ထည့်ပါ"
          error={fieldErrors.price}
        >
          <input
            id="price"
            name="price"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={initial?.price ?? ""}
            placeholder="ဥပမာ — 5000"
            className={inputClass}
          />
        </Field>

        <Field
          id="targetCustomers"
          label="ပစ်မှတ် ဖောက်သည်များ"
          error={fieldErrors.targetCustomers}
        >
          <input
            id="targetCustomers"
            name="targetCustomers"
            maxLength={1000}
            defaultValue={initial?.targetCustomers ?? ""}
            placeholder="ဥပမာ — ကျောင်းသားများ၊ ရုံးဝန်ထမ်းများ"
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        id="description"
        label="ထုတ်ကုန် ဖော်ပြချက်"
        error={fieldErrors.description}
      >
        <textarea
          id="description"
          name="description"
          maxLength={4000}
          rows={3}
          defaultValue={initial?.description ?? ""}
          className={textareaClass}
        />
      </Field>

      <Field
        id="ingredients"
        label="ပါဝင်ပစ္စည်း သို့မဟုတ် ကုန်ကြမ်း"
        error={fieldErrors.ingredients}
      >
        <textarea
          id="ingredients"
          name="ingredients"
          maxLength={2000}
          rows={2}
          defaultValue={initial?.ingredients ?? ""}
          className={textareaClass}
        />
      </Field>

      <Field
        id="benefits"
        label="အကျိုးကျေးဇူးများ"
        error={fieldErrors.benefits}
      >
        <textarea
          id="benefits"
          name="benefits"
          maxLength={2000}
          rows={2}
          defaultValue={initial?.benefits ?? ""}
          className={textareaClass}
        />
      </Field>

      <Field
        id="uniqueSellingPoints"
        label="ထူးခြားသော အချက်များ (USP)"
        error={fieldErrors.uniqueSellingPoints}
      >
        <textarea
          id="uniqueSellingPoints"
          name="uniqueSellingPoints"
          maxLength={2000}
          rows={2}
          defaultValue={initial?.uniqueSellingPoints ?? ""}
          className={textareaClass}
        />
      </Field>

      <div className="flex flex-wrap gap-2 pt-2">
        <button type="submit" className={btnPrimary} disabled={pending}>
          {pending ? "သိမ်းနေသည်…" : mode === "create" ? "ထည့်မည်" : "သိမ်းမည်"}
        </button>
        <Link href={cancelHref} className={btnSecondary}>
          မလုပ်တော့ပါ
        </Link>
      </div>
    </form>
  );
}
