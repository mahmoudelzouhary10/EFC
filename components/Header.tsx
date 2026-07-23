"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
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
  const nameEn = settings?.name_en || "Egyptian Clans Federation";

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B0F14]/95 backdrop-blur">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center">
        <Link href="/league/first" className="flex items-center gap-2.5">
          {settings?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logo_url}
              alt={nameAr}
              className="w-9 h-9 rounded-lg object-cover border border-emerald-400/30"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400/20 to-cyan-400/10 border border-emerald-400/30 flex items-center justify-center">
              <Shield size={18} className="text-emerald-300" />
            </div>
          )}
          <div className="leading-tight">
            <div className="font-display font-bold text-base tracking-wide text-slate-100">{nameAr}</div>
            <div className="text-[10px] text-slate-500">{nameEn} · eFootball</div>
          </div>
        </Link>
      </div>
    </header>
  );
}
