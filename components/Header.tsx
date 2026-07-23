"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FederationSettings } from "@/lib/types";

export default function Header() {
  const supabase = createClient();
  const [settings, setSettings] = useState<FederationSettings | null>(null);

  useEffect(() => {
    supabase
      .from("federation_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => setSettings(data as FederationSettings));
  }, [supabase]);

  const nameAr = settings?.name_ar || "الاتحاد المصري للكلانات";
  const nameEn = settings?.name_en || "Egyptian Federation of Clans";
  const logo = settings?.logo_url || "/logos/first.png";

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md"
      style={{
        background: "rgba(8, 7, 12, 0.88)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
        <Link href="/league/first" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={nameAr} className="w-10 h-10 rounded-full object-cover" />
          <span className="leading-tight">
            <span className="font-ar font-bold text-[15px] block">{nameAr}</span>
            <span
              className="font-display text-[8.5px] uppercase tracking-[0.24em] block"
              style={{ color: "var(--muted)" }}
            >
              {nameEn}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
