import type { CheckState } from "@/lib/health";

const styles: Record<CheckState, string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  down: "bg-red-50 text-red-700 ring-red-200",
  missing: "bg-amber-50 text-amber-700 ring-amber-200",
  unknown: "bg-stone-100 text-stone-600 ring-stone-200",
};

const labels: Record<CheckState, string> = {
  ok: "အဆင်သင့်",
  down: "မချိတ်ဆက်နိုင်ပါ",
  missing: "မရှိသေးပါ",
  unknown: "မသိ",
};

export function StatusBadge({ state }: { state: CheckState }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[state]}`}
    >
      {labels[state]}
    </span>
  );
}
