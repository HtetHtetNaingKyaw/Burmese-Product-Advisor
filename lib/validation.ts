import { z } from "zod";

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} သည် စာလုံး ${max} လုံးထက် မပိုရပါ။`)
    .optional()
    .default("");

export const businessProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, "လုပ်ငန်းအမည် ထည့်ပါ။")
    .max(120, "လုပ်ငန်းအမည်သည် စာလုံး ၁၂၀ ထက် မပိုရပါ။"),
  businessType: z
    .string()
    .trim()
    .min(1, "လုပ်ငန်း အမျိုးအစား ထည့်ပါ။")
    .max(80, "လုပ်ငန်း အမျိုးအစားသည် စာလုံး ၈၀ ထက် မပိုရပါ။"),
  description: text(2000, "လုပ်ငန်း ဖော်ပြချက်"),
  location: text(200, "တည်နေရာ"),
  contact: text(200, "ဆက်သွယ်ရန် အချက်အလက်"),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

const priceSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return null;
    if (typeof value === "string") return Number(value);
    return value;
  },
  z
    .number({ error: "ဈေးနှုန်းကို ဂဏန်းဖြင့် ထည့်ပါ။" })
    .int("ဈေးနှုန်းသည် ကိန်းပြည့် ဖြစ်ရပါမည်။")
    .min(0, "ဈေးနှုန်းသည် အနုတ် မဖြစ်ရပါ။")
    .max(1_000_000_000, "ဈေးနှုန်း များလွန်းနေပါသည်။")
    .nullable(),
);

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "ထုတ်ကုန်အမည် ထည့်ပါ။")
    .max(160, "ထုတ်ကုန်အမည်သည် စာလုံး ၁၆၀ ထက် မပိုရပါ။"),
  category: text(80, "အမျိုးအစား"),
  description: text(4000, "ဖော်ပြချက်"),
  ingredients: text(2000, "ပါဝင်ပစ္စည်း"),
  price: priceSchema,
  benefits: text(2000, "အကျိုးကျေးဇူး"),
  uniqueSellingPoints: text(2000, "ထူးခြားချက်"),
  targetCustomers: text(1000, "ပစ်မှတ် ဖောက်သည်များ"),
});

export type ProductInput = z.infer<typeof productSchema>;

export const productQuerySchema = z.object({
  q: z.string().trim().max(100).catch(""),
  category: z.string().trim().max(80).catch(""),
});

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
