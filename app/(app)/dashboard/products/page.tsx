import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProductFilters } from "@/components/product-filters";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { badgeClass, btnPrimary, formatPrice } from "@/lib/ui";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; category?: string }>;

export default function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <ProductsContent searchParams={searchParams} />
    </Suspense>
  );
}

function ProductsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="ဖွင့်နေသည်">
      <div className="h-7 w-48 rounded-lg bg-stone-200" />
      <div className="h-16 rounded-2xl bg-stone-200" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 rounded-2xl bg-stone-200" />
        ))}
      </div>
    </div>
  );
}

async function ProductsContent({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const category = (params.category ?? "").trim().slice(0, 80);
  const filtered = Boolean(q || category);

  const [profile, products, categoryRows] = await Promise.all([
    prisma.businessProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    }),
    prisma.product.findMany({
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
    }),
    prisma.product.findMany({
      where: {
        businessProfile: { userId: user.id },
        category: { not: null },
      },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  const categories = categoryRows
    .map((row) => row.category)
    .filter((value): value is string => Boolean(value));

  return (
    <div className="space-y-6">
      <PageHeader
        title="ထုတ်ကုန်များ"
        description="သင့်လုပ်ငန်း၏ ထုတ်ကုန်များကို ထည့်သွင်း၊ ရှာဖွေ စီမံပါ။"
        action={
          profile ? (
            <Link href="/dashboard/products/new" className={btnPrimary}>
              ထုတ်ကုန် ထည့်ရန်
            </Link>
          ) : undefined
        }
      />

      {!profile ? (
        <EmptyState
          icon="🏪"
          title="ဦးစွာ လုပ်ငန်း ပရိုဖိုင် ဖန်တီးပါ"
          description="ထုတ်ကုန်များ ထည့်သွင်းရန် လုပ်ငန်း ပရိုဖိုင် လိုအပ်ပါသည်။"
          action={
            <Link href="/dashboard/business" className={btnPrimary}>
              ပရိုဖိုင် ဖန်တီးမည်
            </Link>
          }
        />
      ) : (
        <>
          <ProductFilters
            categories={categories}
            initialQ={q}
            initialCategory={category}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-stone-600">
              ထုတ်ကုန် <span className="font-semibold">{products.length}</span> ခု
              {filtered ? " (စစ်ထုတ်ထားသည်)" : ""}
            </p>
          </div>

          {products.length === 0 ? (
            filtered ? (
              <EmptyState
                icon="🔍"
                title="ရှာဖွေမှု ရလဒ် မတွေ့ပါ"
                description="အခြား စကားလုံး သို့မဟုတ် အမျိုးအစားဖြင့် ထပ်စမ်းပါ။"
                action={
                  <Link href="/dashboard/products" className={btnPrimary}>
                    စစ်ထုတ်မှု ရှင်းလင်းမည်
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon="📦"
                title="ထုတ်ကုန် မရှိသေးပါ"
                description="သင့်လုပ်ငန်း၏ ပထမဆုံး ထုတ်ကုန်ကို ထည့်သွင်းပါ။"
                action={
                  <Link href="/dashboard/products/new" className={btnPrimary}>
                    ထုတ်ကုန် ထည့်မည်
                  </Link>
                }
              />
            )
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold text-stone-900">
                        {product.name}
                      </h2>
                      {product.category && (
                        <span className={badgeClass}>{product.category}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-amber-800">
                      {formatPrice(product.price)}
                    </p>
                    {product.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-stone-500">
                        {product.description}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
