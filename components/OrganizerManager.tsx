"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Save, X, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Match, Organizer } from "@/lib/types";
import { SectionCard } from "./ui";

export default function OrganizerManager({
  allClans,
  onChanged,
}: {
  /** every clan in both divisions, for the "belongs to" picker */
  allClans: Clan[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState("");
  const [newClan, setNewClan] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editClan, setEditClan] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: orgs }, { data: ms }] = await Promise.all([
      supabase.from("organizers").select("*").order("created_at"),
      supabase.from("matches").select("id, organizer_id"),
    ]);
    setOrganizers((orgs as Organizer[]) || []);
    const tally: Record<string, number> = {};
    ((ms as Match[]) || []).forEach((m) => {
      if (m.organizer_id) tally[m.organizer_id] = (tally[m.organizer_id] || 0) + 1;
    });
    setCounts(tally);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase
      .from("organizers")
      .insert({ name: newName.trim(), clan_id: newClan || null });
    if (error) return setError(error.message);
    setNewName("");
    setNewClan("");
    setError(null);
    load();
    onChanged();
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
      .update({ name: editName.trim(), clan_id: editClan || null })
      .eq("id", editingId);
    if (error) setError(error.message);
    setEditingId(null);
    load();
    onChanged();
  };

  const clanName = (id: string | null) =>
    id ? allClans.find((c) => c.id === id)?.name ?? null : null;

  const field = "rounded-lg px-2.5 py-1.5 text-sm bg-obsidian focus:outline-none";
  const fieldStyle = { border: "1px solid var(--hairline)", color: "var(--parchment)" };

  return (
    <SectionCard className="p-4">
      <div className="flex items-center justify-between mb-1">
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
      <p className="text-[11px] mb-3 leading-relaxed" style={{ color: "var(--muted)" }}>
        لو المنظم عنده كلان بيلعب، اختاره من القائمة — النظام مش هيحطه أبدًا على ماتش كلانه.
      </p>

      {error && (
        <p className="text-xs mb-3" style={{ color: "#E8737A" }}>
          {error}
        </p>
      )}

      <div className="space-y-1.5 mb-4">
        {organizers.map((o) => (
          <div
            key={o.id}
            className="rounded-xl px-3 py-2.5"
            style={{ background: "var(--panel-hi)", border: "1px solid var(--hairline)" }}
          >
            {editingId === o.id ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full ${field}`}
                  style={fieldStyle}
                />
                <select
                  value={editClan}
                  onChange={(e) => setEditClan(e.target.value)}
                  className={`w-full ${field}`}
                  style={fieldStyle}
                >
                  <option value="">مش عنده كلان</option>
                  {allClans.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    style={{
                      background: "var(--accent-soft)",
                      border: "1px solid var(--accent-line)",
                      color: "var(--accent-hi)",
                    }}
                  >
                    <Save size={13} /> حفظ
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold truncate">{o.name}</span>
                  <span className="block text-[10px] truncate" style={{ color: "var(--muted)" }}>
                    {clanName(o.clan_id) ? `كلان: ${clanName(o.clan_id)}` : "مش عنده كلان"}
                  </span>
                </span>
                <span
                  className="font-data text-[10px] px-1.5 py-0.5 rounded shrink-0"
                  style={{ color: "var(--accent-hi)", background: "var(--accent-soft)" }}
                >
                  {counts[o.id] || 0}
                </span>
                <button
                  onClick={() => {
                    setEditingId(o.id);
                    setEditName(o.name);
                    setEditClan(o.clan_id || "");
                  }}
                  className="p-1.5"
                  style={{ color: "var(--muted)" }}
                >
                  <Pencil size={13} />
                </button>
                {confirmId === o.id ? (
                  <button
                    onClick={() => remove(o.id)}
                    className="text-[10px] px-2 py-1 rounded-lg font-bold shrink-0"
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
              </div>
            )}
          </div>
        ))}
        {organizers.length === 0 && (
          <p className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
            لسه مفيش منظمين.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <input
          placeholder="اسم المنظم"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={`w-full ${field}`}
          style={fieldStyle}
        />
        <div className="flex gap-2">
          <select
            value={newClan}
            onChange={(e) => setNewClan(e.target.value)}
            className={`flex-1 min-w-0 ${field}`}
            style={fieldStyle}
          >
            <option value="">مش عنده كلان</option>
            {allClans.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={add}
            className="p-2.5 rounded-lg shrink-0"
            style={{
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-line)",
              color: "var(--accent-hi)",
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
