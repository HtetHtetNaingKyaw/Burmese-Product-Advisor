"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "ပင်မ", exact: true },
  { href: "/dashboard/business", label: "လုပ်ငန်း ပရိုဖိုင်", exact: false },
  { href: "/dashboard/products", label: "ထုတ်ကုန်များ", exact: false },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ပင်မ လမ်းညွှန်"
      className="flex gap-1 overflow-x-auto pb-2 text-sm"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition ${
              active
                ? "bg-amber-100 text-amber-900"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
