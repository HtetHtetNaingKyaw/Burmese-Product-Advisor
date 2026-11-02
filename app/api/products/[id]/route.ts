import { NextResponse } from "next/server";
import {
  notFound,
  optionalText,
  readJson,
  serverError,
  unauthorized,
  validationError,
} from "@/lib/api-response";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { productSchema, type ProductInput } from "@/lib/validation";

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

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/products/:id — 404 for another user's product. */
export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const product = await prisma.product.findFirst({
      where: { id, businessProfile: { userId: user.id } },
    });
    if (!product) return notFound("ထုတ်ကုန် မတွေ့ပါ။");
    return NextResponse.json({ product });
  } catch (error) {
    return serverError(error);
  }
}

/** PATCH /api/products/:id — ownership enforced inside the WHERE clause. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const parsed = productSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await prisma.product.updateMany({
      where: { id, businessProfile: { userId: user.id } },
      data: toData(parsed.data),
    });
    if (result.count === 0) return notFound("ထုတ်ကုန် မတွေ့ပါ။");

    const product = await prisma.product.findUnique({ where: { id } });
    return NextResponse.json({ product });
  } catch (error) {
    return serverError(error);
  }
}

/** DELETE /api/products/:id — ownership enforced inside the WHERE clause. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const result = await prisma.product.deleteMany({
      where: { id, businessProfile: { userId: user.id } },
    });
    if (result.count === 0) return notFound("ထုတ်ကုန် မတွေ့ပါ။");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
