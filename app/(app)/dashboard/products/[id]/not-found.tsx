import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { btnPrimary } from "@/lib/ui";

export default function ProductNotFound() {
  return (
    <EmptyState
      icon="📦"
      title="ထုတ်ကုန် မတွေ့ပါ"
      description="ထုတ်ကုန် မရှိတော့ပါ သို့မဟုတ် သင့်ပိုင်ဆိုင်မှု မဟုတ်ပါ။"
      action={
        <Link href="/dashboard/products" className={btnPrimary}>
          ထုတ်ကုန်များသို့ ပြန်သွားမည်
        </Link>
      }
    />
  );
}
