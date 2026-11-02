import { NextResponse } from "next/server";
import {
  jsonError,
  optionalText,
  readJson,
  serverError,
  unauthorized,
  validationError,
} from "@/lib/api-response";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { productQuerySchema, productSchema, type ProductInput } from "@/lib/validation";

function toData(input: ProductInput) {
  return {
    name: input.name,
    category: optionalText(input.category),
    description: optionalText(input.description),
    ingredients: optionalText(input.ingredients),
    price: input.price,
    benefits: optionalText(input.benefits),
    uniqueSellingPoints: optionalText(input.uniqueSellingPoints),
    targetCustomers: optionalText(input.targetCustomers),
  };
}

/** GET /api/products?q=&category= — only the signed-in user's products. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const parsed = productQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    category: url.searchParams.get("category") ?? "",
  });
  const { q, category } = parsed.success ? parsed.data : { q: "", category: "" };

  try {
    const products = await prisma.product.findMany({
      where: {
        businessProfile: { userId: user.id },
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { category: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
                { ingredients: { contains: q, mode: "insensitive" as const } },
                { benefits: { contains: q, mode: "insensitive" as const } },
                {
                  uniqueSellingPoints: {
                    contains: q,
                    mode: "insensitive" as const,
                  },
                },
                {
                  targetCustomers: {
                    contains: q,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ products });
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/products — add a product under the user's own profile. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = productSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const profile = await prisma.businessProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) {
      return jsonError("ဦးစွာ လုပ်ငန်း ပရိုဖိုင် ဖန်တီးပါ။", 409);
    }

    const product = await prisma.product.create({
      data: { businessProfileId: profile.id, ...toData(parsed.data) },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
