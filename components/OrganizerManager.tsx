"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Shuffle, Pencil, Save, X, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Match, Organizer } from "@/lib/types";
import { SectionCard } from "./ui";

/**
 * Walks every matchday in order and hands out organizers from a rotating
 * pointer. Because the pointer carries across matchdays, the total workload
 * stays even (max one match difference between any two organizers), and no
 * organizer gets two matches in the same matchday until everyone has one.
 */
function buildAssignments(matches: Match[], organizerIds: string[]) {
  const byDay: Record<number, Match[]> = {};
  matches.forEach((m) => {
    (byDay[m.matchday] ||= []).push(m);
  });

  const assignments: { id: string; organizer_id: string }[] = [];
  let pointer = 0;

  Object.keys(byDay)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((day) => {
      byDay[day].forEach((m) => {
        assignments.push({ id: m.id, organizer_id: organizerIds[pointer % organizerIds.length] });
        pointer++;
      });
    });

  return assignments;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function OrganizerManager({ onChanged }: { onChanged: () => void }) {
  const supabase = createClient();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalMatches, setTotalMatches] = useState(0);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: orgs }, { data: ms }] = await Promise.all([
      supabase.from("organizers").select("*").order("created_at"),
      supabase.from("matches").select("id, matchday, organizer_id, division_id"),
    ]);
    setOrganizers((orgs as Organizer[]) || []);

    const tally: Record<string, number> = {};
    ((ms as Match[]) || []).forEach((m) => {
      if (m.organizer_id) tally[m.organizer_id] = (tally[m.organizer_id] || 0) + 1;
    });
    setCounts(tally);
    setTotalMatches((ms || []).length);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("organizers").insert({ name: newName.trim() });
    if (error) return setError(error.message);
    setNewName("");
    setError(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("organizers").delete().eq("id", id);
    if (error) setError(error.message);
    setConfirmId(null);
    load();
    onChanged();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from("organizers")
      .update({ name: editName.trim() })
      .eq("id", editingId);
    if (error) setError(error.message);
    setEditingId(null);
    load();
    onChanged();
  };

  /** Assigns organizers across every match in BOTH divisions. */
  const distribute = async (randomize: boolean) => {
    if (organizers.length === 0) return;
    setBusy(true);
    setError(null);
    setNote(null);

    const { data: divs } = await supabase.from("divisions").select("id, key").order("key");
    const ids = randomize ? shuffled(organizers.map((o) => o.id)) : organizers.map((o) => o.id);

    let done = 0;
    for (const d of divs || []) {
      const { data: ms } = await supabase
        .from("matches")
        .select("*")
        .eq("division_id", d.id)
        .order("matchday");

      const list = (ms as Match[]) || [];
      if (list.length === 0) continue;

      const assignments = buildAssignments(list, ids);
      // one update per organizer group keeps this to a handful of requests
      const grouped: Record<string, string[]> = {};
      assignments.forEach((a) => {
        (grouped[a.organizer_id] ||= []).push(a.id);
      });

      for (const [organizerId, matchIds] of Object.entries(grouped)) {
        const { error } = await supabase
          .from("matches")
          .update({ organizer_id: organizerId })
          .in("id", matchIds);
        if (error) {
          setBusy(false);
          return setError(error.message);
        }
        done += matchIds.length;
      }
    }

    setBusy(false);
    setNote(`تم توزيع ${done} مباراة على ${organizers.length} منظم.`);
    load();
    onChanged();
  };

  const per = organizers.length > 0 ? Math.floor(totalMatches / organizers.length) : 0;

  return (
    <div className="space-y-4">
      <SectionCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-ar font-bold text-sm flex items-center gap-2">
            <Users size={15} style={{ color: "var(--accent)" }} /> المنظمين
          </h3>
          <span
            className="font-data text-[11px] px-2 py-0.5 rounded"
            style={{ background: "var(--panel-hi)", color: "var(--muted)" }}
          >
            {organizers.length}
          </span>
        </div>

        {error && (
          <p className="text-xs mb-3" style={{ color: "#E8737A" }}>
            {error}
          </p>
        )}

        <div className="space-y-1.5 mb-4">
          {organizers.map((o) => (
            <div
              key={o.id}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "var(--panel-hi)", border: "1px solid var(--hairline)" }}
            >
              {editingId === o.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-0 rounded-lg px-2 py-1 text-sm bg-obsidian focus:outline-none"
                    style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }}
                  />
                  <button onClick={saveEdit} className="p-1.5" style={{ color: "var(--accent-hi)" }}>
                    <Save size={14} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 min-w-0 truncate text-[13px] font-semibold">{o.name}</span>
                  <span
                    className="font-data text-[10px] px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: "var(--accent-hi)", background: "var(--accent-soft)" }}
                  >
                    {counts[o.id] || 0} ماتش
                  </span>
                  <button
                    onClick={() => {
                      setEditingId(o.id);
                      setEditName(o.name);
                    }}
                    className="p-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    <Pencil size={13} />
                  </button>
                  {confirmId === o.id ? (
                    <button
                      onClick={() => remove(o.id)}
                      className="text-[10px] px-2 py-1 rounded-lg font-bold"
                      style={{ background: "rgba(232,115,122,0.15)", color: "#E8737A" }}
                    >
                      تأكيد؟
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmId(o.id)}
                      className="p-1.5"
                      style={{ color: "var(--muted)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
          {organizers.length === 0 && (
            <p className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
              لسه مفيش منظمين.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            placeholder="اسم المنظم"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm bg-obsidian focus:outline-none"
            style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }}
          />
          <button
            onClick={add}
            className="p-2.5 rounded-xl shrink-0"
            style={{
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-line)",
              color: "var(--accent-hi)",
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </SectionCard>

      <SectionCard className="p-4">
        <h3 className="font-ar font-bold text-sm mb-1">توزيع الجولات</h3>
        <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--muted)" }}>
          {organizers.length === 0
            ? "ضيف المنظمين الأول عشان تقدر توزع."
            : totalMatches === 0
            ? "اعمل جدول المباريات الأول من تبويب Fixtures."
            : `التوزيع بيشمل الدرجتين — ${totalMatches} مباراة على ${organizers.length} منظم، يعني حوالي ${per} مباراة لكل واحد.`}
        </p>

        {note && (
          <p className="text-xs mb-3" style={{ color: "var(--accent-hi)" }}>
            {note}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy || organizers.length === 0 || totalMatches === 0}
            onClick={() => distribute(false)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
            style={{
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-line)",
              color: "var(--accent-hi)",
            }}
          >
            {busy ? "…" : "وزّع بالترتيب"}
          </button>
          <button
            disabled={busy || organizers.length === 0 || totalMatches === 0}
            onClick={() => distribute(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
            style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }}
          >
            <Shuffle size={13} />
            {busy ? "…" : "خلط عشوائي"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
