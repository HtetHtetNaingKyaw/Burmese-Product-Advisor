export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#fef3c7,_transparent_55%),radial-gradient(circle_at_bottom_right,_#d1fae5,_transparent_45%)]"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-600 text-2xl font-bold text-white shadow-lg shadow-amber-600/25">
            မြ
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            မြန်မာ ထုတ်ကုန် အကြံပေး
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            ဒေသခံ AI ဖြင့် သင့်တော်သော ထုတ်ကုန်များကို ရှာဖွေပါ
          </p>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-stone-500">
          ဒေသခံစနစ်တွင်သာ လုပ်ဆောင်သည် — ပြင်ပ AI ဝန်ဆောင်မှု မသုံးပါ
        </p>
      </div>
    </main>
  );
}
