import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { btnPrimary } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader title="ထုတ်ကုန် အသစ် ထည့်ရန်" />
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ထုတ်ကုန် အသစ် ထည့်ရန်"
        description="ထုတ်ကုန် အချက်အလက်များကို ဖြည့်ပြီး သိမ်းပါ။"
      />
      <ProductForm mode="create" />
    </div>
  );
}
