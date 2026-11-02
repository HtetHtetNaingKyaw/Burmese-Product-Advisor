import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * Look up a product only if it belongs to the given user.
 * Cached per request so generateMetadata and the page share one query.
 */
export const getOwnedProduct = cache(async (userId: string, id: string) => {
  return prisma.product.findFirst({
    where: { id, businessProfile: { userId } },
  });
});
