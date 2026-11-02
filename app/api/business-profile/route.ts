import { NextResponse } from "next/server";
import {
  isPrismaError,
  jsonError,
  notFound,
  optionalText,
  readJson,
  serverError,
  unauthorized,
  validationError,
} from "@/lib/api-response";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { businessProfileSchema } from "@/lib/validation";

function toData(input: {
  businessName: string;
  businessType: string;
  description: string;
  location: string;
  contact: string;
}) {
  return {
    businessName: input.businessName,
    businessType: input.businessType,
    description: optionalText(input.description),
    location: optionalText(input.location),
    contact: optionalText(input.contact),
  };
}

/** GET /api/business-profile — the signed-in user's profile. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const profile = await prisma.businessProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) return notFound("လုပ်ငန်း ပရိုဖိုင် မရှိသေးပါ။");
    return NextResponse.json({ profile });
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/business-profile — create the profile (one per user). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = businessProfileSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const profile = await prisma.businessProfile.create({
      data: { userId: user.id, ...toData(parsed.data) },
    });
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return jsonError("လုပ်ငန်း ပရိုဖိုင် ရှိပြီး ဖြစ်ပါသည်။", 409);
    }
    return serverError(error);
  }
}

/** PATCH /api/business-profile — update the signed-in user's profile. */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = businessProfileSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const profile = await prisma.businessProfile.update({
      where: { userId: user.id },
      data: toData(parsed.data),
    });
    return NextResponse.json({ profile });
  } catch (error) {
    if (isPrismaError(error, "P2025")) return notFound("လုပ်ငန်း ပရိုဖိုင် မရှိသေးပါ။");
    return serverError(error);
  }
}

/** DELETE /api/business-profile — removes the profile and its products. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    await prisma.businessProfile.delete({ where: { userId: user.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isPrismaError(error, "P2025")) return notFound("လုပ်ငန်း ပရိုဖိုင် မရှိသေးပါ။");
    return serverError(error);
  }
}
