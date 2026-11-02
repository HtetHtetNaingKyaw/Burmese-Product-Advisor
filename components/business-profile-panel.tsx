"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BusinessProfileForm,
  type BusinessProfileValues,
} from "@/components/business-profile-form";
import { DeleteConfirm } from "@/components/delete-confirm";
import { btnSecondary, cardClass, formatDate } from "@/lib/ui";

type Profile = BusinessProfileValues & { createdAt: string };

export function BusinessProfilePanel({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");

  if (!profile) {
    return (
      <BusinessProfileForm
        mode="create"
        onSuccess={() => router.refresh()}
      />
    );
  }

  if (mode === "edit") {
    return (
      <BusinessProfileForm
        mode="edit"
        initial={profile}
        onSuccess={() => {
          setMode("view");
          router.refresh();
        }}
        onCancel={() => setMode("view")}
      />
    );
  }

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">
            {profile.businessName}
          </h2>
          <p className="mt-0.5 text-sm text-stone-600">{profile.businessType}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setMode("edit")}
          >
            ပြင်ဆင်ရန်
          </button>
          <DeleteConfirm
            endpoint="/api/business-profile"
            message="လုပ်ငန်း ပရိုဖိုင်နှင့် ၎င်း၏ ထုတ်ကုန် အားလုံးကို ဖျက်ပစ်မည်။ ပြန်ယူ၍ မရပါ။"
            redirectTo="/dashboard"
          />
        </div>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold tracking-wide text-stone-500">
            တည်နေရာ
          </dt>
          <dd className="mt-1 text-sm text-stone-800">
            {profile.location || "မဖြည့်ထားပါ"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wide text-stone-500">
            ဆက်သွယ်ရန်
          </dt>
          <dd className="mt-1 text-sm text-stone-800">
            {profile.contact || "မဖြည့်ထားပါ"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold tracking-wide text-stone-500">
            လုပ်ငန်း ဖော်ပြချက်
          </dt>
          <dd className="mt-1 whitespace-pre-line text-sm text-stone-800">
            {profile.description || "မဖြည့်ထားပါ"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold tracking-wide text-stone-500">
            ဖန်တီးခဲ့သည့် ရက်စွဲ
          </dt>
          <dd className="mt-1 text-sm text-stone-800">
            {formatDate(profile.createdAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
