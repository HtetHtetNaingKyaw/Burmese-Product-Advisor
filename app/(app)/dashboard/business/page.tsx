import { redirect } from "next/navigation";
import { BusinessProfilePanel } from "@/components/business-profile-panel";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BusinessPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="လုပ်ငန်း ပရိုဖိုင်"
        description="သင့်လုပ်ငန်း အချက်အလက်ကို တစ်နေရာတည်းတွင် စီမံပါ။ ဤအချက်အလက်များကို ထုတ်ကုန် အကြံပြုချက်များတွင် အသုံးပြုပါမည်။"
      />

      <BusinessProfilePanel
        profile={
          profile
            ? {
                businessName: profile.businessName,
                businessType: profile.businessType,
                description: profile.description,
                location: profile.location,
                contact: profile.contact,
                createdAt: profile.createdAt.toISOString(),
              }
            : null
        }
      />
    </div>
  );
}
