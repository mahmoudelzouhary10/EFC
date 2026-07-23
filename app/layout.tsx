import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "الاتحاد المصري للكلانات | eFootball",
  description: "الترتيب والجدول والنتائج لدوريّ الاتحاد المصري للكلانات في eFootball.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-5">{children}</main>
        <footer className="max-w-3xl mx-auto px-4 pb-8 pt-2 text-center text-[11px] text-slate-600">
          الاتحاد المصري للكلانات · eFootball League Manager
        </footer>
      </body>
    </html>
  );
}
