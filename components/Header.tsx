"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
    <header
      className="sticky top-0 z-30 backdrop-blur-md"
      style={{ background: "rgba(8,7,12,0.92)", borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/league/first" className="flex items-center gap-2.5">
          <img src={logo} alt={nameAr} className="w-9 h-9 rounded-full object-cover" />
          <span className="font-ar font-bold text-sm">{nameAr}</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/league/first"
            className="font-ar text-xs font-semibold"
            style={{ color: "var(--muted)" }}
          >
            الدوري
          </Link>
          <Link
            href="/cup"
            className="font-ar text-xs font-semibold"
            style={{ color: "var(--accent)" }}
          >
            الكأس
          </Link>
        </nav>
      </div>
    </header>
  );
}
