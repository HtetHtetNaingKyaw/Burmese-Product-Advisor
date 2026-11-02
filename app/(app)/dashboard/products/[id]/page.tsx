import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DeleteConfirm } from "@/components/delete-confirm";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnedProduct } from "@/lib/queries";
import {
  badgeClass,
  btnSecondary,
  cardClass,
  formatDate,
  formatPrice,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const user = await getCurrentUser();
  if (!user) return { title: "ထုတ်ကုန် အသေးစိတ်" };

  const { id } = await params;
  const product = await getOwnedProduct(user.id, id);
  if (!product) notFound();
  return { title: `${product.name} — ထုတ်ကုန် အသေးစိတ်` };
}

const textSections = [
  { key: "description", label: "ဖော်ပြချက်" },
  { key: "ingredients", label: "ပါဝင်ပစ္စည်း / ကုန်ကြမ်း" },
  { key: "benefits", label: "အကျိုးကျေးဇူးများ" },
  { key: "uniqueSellingPoints", label: "ထူးခြားသော အချက်များ" },
  { key: "targetCustomers", label: "ပစ်မှတ် ဖောက်သည်များ" },
] as const;

export default async function ProductDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const product = await getOwnedProduct(user.id, id);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/products"
        className="text-sm font-medium text-stone-600 hover:text-stone-900"
      >
        ← ထုတ်ကုန်များသို့
      </Link>

      <PageHeader
        title={product.name}
        description={product.category ?? "အမျိုးအစား မသတ်မှတ်ထားပါ"}
        action={
          <div className="flex flex-wrap items-start gap-2">
            <Link
              href={`/dashboard/products/${product.id}/edit`}
              className={btnSecondary}
            >
              ပြင်ဆင်ရန်
            </Link>
            <DeleteConfirm
              endpoint={`/api/products/${product.id}`}
              message={`"${product.name}" ကို ဖျက်ပစ်မည်။ ပြန်ယူ၍ မရပါ။`}
              redirectTo="/dashboard/products"
            />
          </div>
        }
      />

      <div className={cardClass}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-stone-500">
              ဈေးနှုန်း
            </p>
            <p className="mt-1 text-lg font-bold text-amber-800">
              {formatPrice(product.price)}
            </p>
          </div>
          {product.category && (
            <span className={badgeClass}>{product.category}</span>
          )}
          <div className="ml-auto text-right text-xs text-stone-500">
            <p>ဖန်တီး — {formatDate(product.createdAt)}</p>
            <p>မွမ်းမံ — {formatDate(product.updatedAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {textSections.map((section) => (
          <div key={section.key} className={cardClass}>
            <h2 className="text-sm font-semibold text-stone-900">
              {section.label}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-stone-700">
              {product[section.key] || (
                <span className="text-stone-400">မဖြည့်ထားပါ</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
