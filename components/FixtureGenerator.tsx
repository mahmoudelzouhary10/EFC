"use client";

import { useState } from "react";
import { RefreshCw, Lock, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Division, Match } from "@/lib/types";
import { generateFixtures } from "@/lib/fixtures";
import { SectionCard } from "./ui";

const UNLOCK_PHRASE = "امسح الجدول";

export default function FixtureGenerator({
  division,
  clans,
  matches,
  onChanged,
}: {
  division: Division;
  clans: Clan[];
  matches: Match[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [typed, setTyped] = useState("");

  const ready = clans.length === 10;
  const hasFixtures = matches.length > 0;
  const playedCount = matches.filter((m) => m.played).length;
  const started = playedCount > 0;

  // Once results exist, the phrase must be typed before anything can run.
  const locked = started && typed.trim() !== UNLOCK_PHRASE;

  const run = async (double: boolean) => {
    if (locked) return;
    setBusy(true);
    await supabase.from("matches").delete().eq("division_id", division.id);

    const drafts = generateFixtures(clans.map((c) => c.id), double).map((d) => ({
      division_id: division.id,
      matchday: d.matchday,
      home_clan_id: d.home_clan_id,
      away_clan_id: d.away_clan_id,
      played: false,
    }));

    const { error } = await supabase.from("matches").insert(drafts);
    setBusy(false);
    setShowDanger(false);
    setTyped("");
    if (error) alert(error.message);
    onChanged();
  };

  // ---- League already running: keep the destructive path behind a lock ----
  if (started && !showDanger) {
    return (
      <SectionCard className="p-4">
        <h3 className="font-ar font-bold text-sm flex items-center gap-2 mb-1.5">
          <Lock size={15} style={{ color: "var(--accent)" }} /> الجدول متقفل
        </h3>
        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
          الدوري بدأ خلاص — متسجل <strong style={{ color: "var(--parchment)" }}>{playedCount}</strong>{" "}
          نتيجة في {division.name_ar}. إعادة عمل الجدول هتمسح كل المباريات والنتايج، عشان كده
          الزراير متقفلة.
        </p>
        <button
          onClick={() => setShowDanger(true)}
          className="text-[11px] font-semibold underline underline-offset-4"
          style={{ color: "var(--muted)" }}
        >
          محتاج أعمل الجدول من الأول برضه
        </button>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="p-4">
      <h3 className="font-ar font-bold text-sm flex items-center gap-2 mb-1.5">
        <RefreshCw size={15} style={{ color: "var(--accent)" }} /> عمل الجدول
      </h3>

      {started ? (
        <div
          className="rounded-xl p-3 mb-3"
          style={{ background: "rgba(232,115,122,0.08)", border: "1px solid rgba(232,115,122,0.35)" }}
        >
          <p className="text-xs font-bold flex items-center gap-1.5 mb-1.5" style={{ color: "#E8737A" }}>
            <AlertTriangle size={13} /> تحذير: هتفقد {playedCount} نتيجة
          </p>
          <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: "var(--muted)" }}>
            اكتب <strong style={{ color: "var(--parchment)" }}>{UNLOCK_PHRASE}</strong> تحت عشان
            تفتح الزراير. الخطوة دي مالهاش رجعة.
          </p>
          <div className="flex gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={UNLOCK_PHRASE}
              className="flex-1 min-w-0 rounded-lg px-3 py-1.5 text-sm bg-obsidian focus:outline-none"
              style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }}
            />
            <button
              onClick={() => {
                setShowDanger(false);
                setTyped("");
              }}
              className="px-3 text-[11px] font-semibold shrink-0"
              style={{ color: "var(--muted)" }}
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
          {ready
            ? `${division.name_ar} فيها 10 كلانات — جاهزة.`
            : `محتاج 10 كلانات بالظبط (دلوقتي ${clans.length}).`}
          {hasFixtures && " فيه جدول موجود، وإعادة العمل هتستبدله."}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {([
          { mode: "single", label: "دور واحد · 9 جولات" },
          { mode: "double", label: "ذهاب وإياب · 18 جولة" },
        ] as const).map(({ mode, label }) => {
          const disabled = !ready || busy || locked;
          return (
            <button
              key={mode}
              disabled={disabled}
              onClick={() => run(mode === "double")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-opacity"
              style={{
                background: disabled ? "transparent" : "var(--accent-soft)",
                border: `1px solid ${disabled ? "var(--hairline)" : "var(--accent-line)"}`,
                color: disabled ? "var(--muted)" : "var(--accent-hi)",
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "…" : label}
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
