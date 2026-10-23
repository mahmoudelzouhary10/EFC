"use client";

import { useMemo, useState } from "react";
import { Repeat, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Cup, CupGroup, CupGroupClan, CupMatch } from "@/lib/types";
import { SectionCard } from "./ui";

/**
 * Puts a different clan in the exact place of a clan that is already in the
 * cup: same group, same fixtures, same results, same bracket slot. Nothing
 * else about the draw changes.
 */
export default function CupReplaceClan({
  cup, groups, groupClans, cupMatches, allClans, onChanged,
}: {
  cup: Cup;
  groups: CupGroup[];
  groupClans: CupGroupClan[];
  cupMatches: CupMatch[];
  allClans: Clan[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [oldId, setOldId] = useState("");
  const [newId, setNewId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const groupIds = useMemo(() => groups.map((g) => g.id), [groups]);

  // every clan that currently appears anywhere in this cup
  const inCup = useMemo(() => {
    const s = new Set<string>();
    groupClans.filter((gc) => groupIds.includes(gc.group_id)).forEach((gc) => s.add(gc.clan_id));
    cupMatches.forEach((m) => {
      [m.home_clan_id, m.away_clan_id, m.winner_id].forEach((id) => id && s.add(id));
    });
    return s;
  }, [groupClans, cupMatches, groupIds]);

  const oldOptions = allClans.filter((c) => inCup.has(c.id));
  const newOptions = allClans.filter((c) => !c.withdrawn && !inCup.has(c.id));
  const name = (id: string) => allClans.find((c) => c.id === id)?.name ?? "—";

  const run = async () => {
    if (!oldId || !newId) return;
    setBusy(true);
    setError(null);

    const steps = [
      supabase.from("cup_group_clans").update({ clan_id: newId }).eq("clan_id", oldId).in("group_id", groupIds),
      supabase.from("cup_matches").update({ home_clan_id: newId }).eq("cup_id", cup.id).eq("home_clan_id", oldId),
      supabase.from("cup_matches").update({ away_clan_id: newId }).eq("cup_id", cup.id).eq("away_clan_id", oldId),
      supabase.from("cup_matches").update({ winner_id: newId }).eq("cup_id", cup.id).eq("winner_id", oldId),
    ];
    for (const step of steps) {
      const { error } = await step;
      if (error) {
        setError(`${error.message} — لو حصل خطأ، اختار نفس الكلانين وجرب تاني.`);
        setBusy(false);
        setConfirming(false);
        onChanged();
        return;
      }
    }

    setDone(`${name(newId)} دخل مكان ${name(oldId)}.`);
    setOldId("");
    setNewId("");
    setConfirming(false);
    setBusy(false);
    onChanged();
  };

  const field = "w-full rounded-xl px-3 py-2 text-sm bg-obsidian focus:outline-none";
  const fieldStyle = { border: "1px solid var(--hairline)", color: "var(--parchment)" };

  return (
    <SectionCard className="p-4 mt-6">
      <h3 className="font-ar font-bold text-sm flex items-center gap-2 mb-1.5">
        <Repeat size={15} style={{ color: "var(--accent)" }} /> استبدال كلان في الكأس
      </h3>
      <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
        الكلان الجديد بيدخل في نفس مكان القديم بالظبط: نفس المجموعة، نفس الماتشات، ونفس النتايج لو اتلعب
        أي ماتش. مفيش حاجة تانية في القرعة بتتغير.
      </p>

      {done && <p className="text-xs mb-3" style={{ color: "var(--accent-hi)" }}>{done}</p>}
      {error && (
        <p className="text-xs mb-3 flex items-start gap-1.5" style={{ color: "#E8737A" }}>
          <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <div className="space-y-2 mb-3">
        <select value={oldId} onChange={(e) => { setOldId(e.target.value); setConfirming(false); setDone(null); }}
          className={field} style={fieldStyle}>
          <option value="">الكلان اللي هيطلع من الكأس</option>
          {oldOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.withdrawn ? " (منسحب)" : ""}</option>
          ))}
        </select>
        <select value={newId} onChange={(e) => { setNewId(e.target.value); setConfirming(false); setDone(null); }}
          className={field} style={fieldStyle}>
          <option value="">الكلان اللي هيدخل مكانه</option>
          {newOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {confirming && oldId && newId ? (
        <div className="rounded-xl p-3 mb-1"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)" }}>
          <p className="text-xs mb-2.5 leading-relaxed">
            <strong>{name(newId)}</strong> هيدخل مكان <strong>{name(oldId)}</strong> في كل ماتشاته ونتايجه
            ومكانه في المجموعة والبراكيت. متأكد؟
          </p>
          <div className="flex gap-2">
            <button onClick={run} disabled={busy}
              className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
              {busy ? "…" : "تأكيد الاستبدال"}
            </button>
            <button onClick={() => setConfirming(false)} className="px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>إلغاء</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} disabled={!oldId || !newId}
          className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
          استبدال
        </button>
      )}
    </SectionCard>
  );
}
