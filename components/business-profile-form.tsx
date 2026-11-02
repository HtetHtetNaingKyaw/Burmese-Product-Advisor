"use client";

import { useState } from "react";
import { Field } from "@/components/field";
import { btnPrimary, btnSecondary, inputClass, textareaClass } from "@/lib/ui";

export type BusinessProfileValues = {
  businessName: string;
  businessType: string;
  description: string | null;
  location: string | null;
  contact: string | null;
};

export function BusinessProfileForm({
  mode,
  initial,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: BusinessProfileValues | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const payload = {
      businessName: String(formData.get("businessName") ?? ""),
      businessType: String(formData.get("businessType") ?? ""),
      description: String(formData.get("description") ?? ""),
      location: String(formData.get("location") ?? ""),
      contact: String(formData.get("contact") ?? ""),
    };

    try {
      const response = await fetch("/api/business-profile", {
        method: mode === "create" ? "POST" : "PATCH",
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

      setPending(false);
      onSuccess?.();
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
          {mode === "create" ? "လုပ်ငန်း ပရိုဖိုင် ဖန်တီးရန်" : "လုပ်ငန်း ပရိုဖိုင် ပြင်ဆင်ရန်"}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          ဤအချက်အလက်များကို ထုတ်ကုန် အကြံပြုချက်များတွင် အသုံးပြုပါမည်။
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
          id="businessName"
          label="လုပ်ငန်း အမည်"
          required
          error={fieldErrors.businessName}
        >
          <input
            id="businessName"
            name="businessName"
            required
            maxLength={120}
            defaultValue={initial?.businessName ?? ""}
            placeholder="ဥပမာ — ရွှေမိုး လက်ဖက်ရည်"
            className={inputClass}
          />
        </Field>

        <Field
          id="businessType"
          label="လုပ်ငန်း အမျိုးအစား"
          required
          hint="ဥပမာ — အစားအသောက်၊ အဝတ်အထည်၊ လက်မှုပစ္စည်း"
          error={fieldErrors.businessType}
        >
          <input
            id="businessType"
            name="businessType"
            required
            maxLength={80}
            defaultValue={initial?.businessType ?? ""}
            className={inputClass}
          />
        </Field>

        <Field id="location" label="တည်နေရာ" error={fieldErrors.location}>
          <input
            id="location"
            name="location"
            maxLength={200}
            defaultValue={initial?.location ?? ""}
            placeholder="ဥပမာ — မန္တလေး၊ ချမ်းအေးသာစံ"
            className={inputClass}
          />
        </Field>

        <Field
          id="contact"
          label="ဆက်သွယ်ရန် အချက်အလက်"
          hint="ဖုန်းနံပါတ်၊ လိပ်စာ သို့မဟုတ် လူမှုကွန်ရက် စာမျက်နှာ"
          error={fieldErrors.contact}
        >
          <input
            id="contact"
            name="contact"
            maxLength={200}
            defaultValue={initial?.contact ?? ""}
            placeholder="ဥပမာ — ၀၉ ၇၉ ၅၅၅ ၁၂၃၄"
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        id="description"
        label="လုပ်ငန်း ဖော်ပြချက်"
        error={fieldErrors.description}
      >
        <textarea
          id="description"
          name="description"
          maxLength={2000}
          rows={4}
          defaultValue={initial?.description ?? ""}
          placeholder="လုပ်ငန်းအကြောင်း အနှစ်ချုပ် ရေးပါ…"
          className={textareaClass}
        />
      </Field>

      <div className="flex flex-wrap gap-2 pt-2">
        <button type="submit" className={btnPrimary} disabled={pending}>
          {pending ? "သိမ်းနေသည်…" : mode === "create" ? "ဖန်တီးမည်" : "သိမ်းမည်"}
        </button>
        {onCancel && (
          <button
            type="button"
            className={btnSecondary}
            onClick={onCancel}
            disabled={pending}
          >
            မလုပ်တော့ပါ
          </button>
        )}
      </div>
    </form>
  );
}
