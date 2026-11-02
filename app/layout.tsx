import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "မြန်မာ ထုတ်ကုန် အကြံပေး",
  description: "ဒေသခံ AI ဖြင့် ထုတ်ကုန်များကို ရှာဖွေ အကြံပြုပေးသော စနစ်",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="my">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
