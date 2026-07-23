import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "الاتحاد المصري للكلانات | eFootball",
  description: "ترتيب الدوري وجداول المباريات والنتائج للدرجة الأولى والدرجة الثانية.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar">
      <body className="min-h-screen">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-5">{children}</main>
        <footer className="max-w-3xl mx-auto px-4 pb-10 pt-6 text-center">
          <div className="rule w-24 mx-auto mb-4" />
          <p
            className="font-display text-[9px] uppercase tracking-[0.28em]"
            style={{ color: "var(--muted)" }}
          >
            Egyptian Federation of Clans
          </p>
        </footer>
      </body>
    </html>
  );
}
