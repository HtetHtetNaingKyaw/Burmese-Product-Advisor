import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnedProduct } from "@/lib/queries";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const user = await getCurrentUser();
  if (!user) return { title: "ထုတ်ကုန် ပြင်ဆင်ရန်" };

  const { id } = await params;
  const product = await getOwnedProduct(user.id, id);
  if (!product) notFound();
  return { title: `${product.name} — ပြင်ဆင်ရန်` };
}

export default async function EditProductPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const product = await getOwnedProduct(user.id, id);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/products/${product.id}`}
        className="text-sm font-medium text-stone-600 hover:text-stone-900"
      >
        ← ထုတ်ကုန် အသေးစိတ်သို့
      </Link>

      <PageHeader
        title="ထုတ်ကုန် ပြင်ဆင်ရန်"
        description={product.name}
      />

      <ProductForm
        mode="edit"
        initial={{
          id: product.id,
          name: product.name,
          category: product.category,
          description: product.description,
          ingredients: product.ingredients,
          price: product.price,
          benefits: product.benefits,
          uniqueSellingPoints: product.uniqueSellingPoints,
          targetCustomers: product.targetCustomers,
        }}
      />
    </div>
  );
}
