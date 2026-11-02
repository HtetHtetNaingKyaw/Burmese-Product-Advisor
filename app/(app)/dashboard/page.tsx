import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getHealth } from "@/lib/health";
import {
  badgeClass,
  btnPrimary,
  btnSecondary,
  cardClass,
  formatPrice,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, productCount, recentProducts, health] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { userId: user.id } }),
    prisma.product.count({ where: { businessProfile: { userId: user.id } } }),
    prisma.product.findMany({
      where: { businessProfile: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    getHealth(),
  ]);

  const { database, pgvector, ollama, ffmpeg, models } = health.checks;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`မင်္ဂလာပါ${user.name ? `၊ ${user.name}` : ""}`}
        description="သင့်လုပ်ငန်းနှင့် ထုတ်ကုန်များကို ဤနေရာမှ စီမံနိုင်ပါသည်။"
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="text-sm text-stone-500">ထုတ်ကုန် စုစုပေါင်း</p>
          <p className="mt-1 text-3xl font-bold text-stone-900">{productCount}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-stone-500">လုပ်ငန်း အမျိုးအစား</p>
          <p className="mt-1 truncate text-lg font-semibold text-stone-900">
            {profile?.businessType ?? "—"}
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-stone-500">လုပ်ငန်း ပရိုဖိုင်</p>
          <p className="mt-1">
            {profile ? (
              <span className={badgeClass}>ပြည့်စုံပြီး</span>
            ) : (
              <span className="text-sm text-stone-600">မရှိသေးပါ</span>
            )}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">လုပ်ငန်း ပရိုဖိုင်</h2>
        {profile ? (
          <div className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xl font-bold text-stone-900">
                  {profile.businessName}
                </p>
                <p className="mt-0.5 text-sm text-stone-600">
                  {profile.businessType}
                  {profile.location ? ` · ${profile.location}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard/business" className={btnSecondary}>
                  ကြည့်ရန် / ပြင်ရန်
                </Link>
                <Link href="/dashboard/products/new" className={btnPrimary}>
                  ထုတ်ကုန် ထည့်ရန်
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="🏪"
            title="လုပ်ငန်း ပရိုဖိုင် မရှိသေးပါ"
            description="ထုတ်ကုန်များ ထည့်သွင်းရန် ဦးစွာ သင့်လုပ်ငန်း အချက်အလက်ကို ဖြည့်ပါ။"
            action={
              <Link href="/dashboard/business" className={btnPrimary}>
                ပရိုဖိုင် ဖန်တီးမည်
              </Link>
            }
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">
            နောက်ဆုံး ထည့်ထားသော ထုတ်ကုန်များ
          </h2>
          {productCount > 0 && (
            <Link
              href="/dashboard/products"
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              အားလုံး ကြည့်ရန်
            </Link>
          )}
        </div>

        {recentProducts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-center text-sm text-stone-600">
            ထုတ်ကုန် မရှိသေးပါ။{" "}
            {profile ? (
              <Link
                href="/dashboard/products/new"
                className="font-semibold text-amber-700 hover:underline"
              >
                ပထမဆုံး ထုတ်ကုန် ထည့်ပါ
              </Link>
            ) : (
              "ဦးစွာ လုပ်ငန်း ပရိုဖိုင် ဖန်တီးပါ။"
            )}
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {recentProducts.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-stone-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-900">
                      {product.name}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {product.category || "အမျိုးအစား မသတ်မှတ်ထားပါ"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-stone-700">
                    {formatPrice(product.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">စနစ် အခြေအနေ</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "ဒေတာဘေ့စ်", caption: "PostgreSQL 17", check: database },
            { title: "pgvector", caption: "vector အညွှန်း", check: pgvector },
            { title: "ဒေသခံ LLM", caption: "Ollama", check: ollama },
            { title: "ffmpeg", caption: "အသံ ပြောင်းလဲမှု", check: ffmpeg },
          ].map((item) => (
            <div key={item.title} className={cardClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-900">{item.title}</p>
                  <p className="text-xs text-stone-500">{item.caption}</p>
                </div>
                <StatusBadge state={item.check.state} />
              </div>
              <p
                className="mt-3 truncate text-xs text-stone-500"
                title={item.check.detail}
              >
                {item.check.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm shadow-sm">
          <p className="font-semibold text-stone-900">ဒေသခံ မော်ဒယ်များ</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {models.map((model) => (
              <span key={model.id} className="flex items-center gap-2 text-xs text-stone-600">
                {model.name}
                <StatusBadge state={model.state} />
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-stone-500">
          AI စကားပြောနှင့် အသံ လုပ်ဆောင်ချက်များကို နောက်အဆင့်များတွင် ထည့်သွင်းပါမည်။
        </p>
      </section>
    </div>
  );
}
