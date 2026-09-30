"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Trophy, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FederationSettings } from "@/lib/types";

export default function Header() {
  const supabase = createClient();
  const [s, setS] = useState<FederationSettings | null>(null);
  useEffect(() => {
    supabase.from("federation_settings").select("*").eq("id",1).single()
      .then(({ data }) => setS(data as FederationSettings));
  }, [supabase]);
  const nameAr = s?.name_ar || "الاتحاد المصري للكلانات";
  const logo = s?.logo_url || "/logos/first.png";
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md" style={{ background: "rgba(8,7,12,0.9)", borderBottom: "1px solid var(--hairline)" }}>
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/league/first" className="flex items-center gap-2.5">
          <img src={logo} alt={nameAr} className="w-9 h-9 rounded-full object-cover" />
          <span className="font-ar font-bold text-sm">{nameAr}</span>
        </Link>
        <nav className="flex items-center gap-1.5">
          <Link href="/cup"
            className="p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5"
            style={{ borderColor: "var(--hairline)", color: "var(--accent)", borderTopColor: "var(--accent-line)" }}>
            <Trophy size={14} /> <span className="hidden sm:inline">الكأس</span>
          </Link>
          <Link href="/admin/login"
            className="p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5"
            style={{ borderColor: "var(--hairline)", color: "var(--muted)" }}>
            <Lock size={14} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
