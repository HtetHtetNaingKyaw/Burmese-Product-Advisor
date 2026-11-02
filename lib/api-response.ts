import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { fieldErrorsFrom } from "@/lib/validation";

export function jsonError(
  message: string,
  status: number,
  fieldErrors?: Record<string, string>,
) {
  return NextResponse.json(
    fieldErrors ? { error: message, fieldErrors } : { error: message },
    { status },
  );
}

export function validationError(error: ZodError) {
  return jsonError("ဒေတာ မမှန်ကန်ပါ။", 400, fieldErrorsFrom(error));
}

export function unauthorized() {
  return jsonError("အကောင့်ဝင်ရန် လိုအပ်ပါသည်။", 401);
}

export function notFound(message = "အချက်အလက် မတွေ့ပါ။") {
  return jsonError(message, 404);
}

export function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export function serverError(error: unknown) {
  console.error("[api]", error);
  return jsonError("ဆာဗာ အမှား ဖြစ်ပေါ်နေပါသည်။ နောက်မှ ထပ်စမ်းပါ။", 500);
}

/** Parse a JSON body without throwing on malformed input. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Turn trimmed empty strings into NULL so optional columns stay clean. */
export function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
