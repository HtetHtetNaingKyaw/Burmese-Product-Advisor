export const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";

export const textareaClass = `${inputClass} min-h-24 resize-y`;

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus:ring-2 focus:ring-amber-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 focus:outline-none disabled:opacity-60";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none disabled:opacity-60";

export const cardClass = "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm";

export const badgeClass =
  "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200";

export function formatPrice(price: number | null): string {
  if (price === null) return "ဈေးနှုန်း မသတ်မှတ်ထားပါ";
  return `${new Intl.NumberFormat("en-US").format(price)} ကျပ်`;
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
