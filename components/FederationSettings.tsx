"use client";

import { useEffect, useState } from "react";
import { Save, Upload, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FederationSettings as Settings } from "@/lib/types";
import { uploadLogo } from "@/lib/uploadLogo";
import { SectionCard } from "./ui";

export default function FederationSettingsPanel() {
  const supabase = createClient();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("federation_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        const s = data as Settings;
        setSettings(s);
        setNameAr(s?.name_ar || "");
        setNameEn(s?.name_en || "");
      });
  }, [supabase]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updates: Record<string, any> = { name_ar: nameAr.trim(), name_en: nameEn.trim() };
      if (logoFile) {
        updates.logo_url = await uploadLogo(supabase, logoFile, "federation/logo");
      }
      const { error } = await supabase.from("federation_settings").update(updates).eq("id", 1);
      if (error) throw error;
      setLogoFile(null);
      setSaved(true);
      const { data } = await supabase.from("federation_settings").select("*").eq("id", 1).single();
      setSettings(data as Settings);
    } catch (e: any) {
      setError(e.message || "Couldn't save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard className="p-4">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">Federation Branding</h3>

      <div className="flex items-center gap-3 mb-4">
        {settings?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Shield size={22} className="text-slate-600" />
          </div>
        )}
        <label className="flex-1 flex items-center gap-2 text-xs text-slate-400 border border-dashed border-white/15 rounded-lg px-3 py-2.5 cursor-pointer hover:border-emerald-400/40">
          <Upload size={13} />
          {logoFile ? logoFile.name : "Upload federation logo"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <label className="text-[11px] text-slate-500 mb-1 block">Federation name (Arabic)</label>
          <input
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            dir="rtl"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400/60"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 mb-1 block">Federation name (English)</label>
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400/60"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      {saved && !error && <p className="text-xs text-emerald-400 mb-2">Saved — visible on the public pages now.</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/50 text-emerald-300 text-sm font-semibold hover:bg-emerald-400/20 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Save size={14} /> {saving ? "Saving…" : "Save Branding"}
      </button>
    </SectionCard>
  );
}
