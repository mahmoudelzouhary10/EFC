"use client";

import { useState } from "react";
import { Users, Plus, Trash2, Pencil, Save, X, Shield, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Division } from "@/lib/types";
import { uploadLogo } from "@/lib/uploadLogo";
import { SectionCard } from "./ui";

function LogoThumb({ url, size = 28 }: { url: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-white/10 shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border border-white/10 bg-white/5 flex items-center justify-center shrink-0"
    >
      <Shield size={size * 0.55} className="text-slate-600" />
    </div>
  );
}

export default function ClanManager({
  division,
  clans,
  onChanged,
}: {
  division: Division;
  clans: Clan[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [newName, setNewName] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", tag: "" });
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const full = clans.length >= 10;

  const addClan = async () => {
    if (!newName.trim() || full) return;
    setBusy(true);
    setError(null);
    try {
      const tag = (newTag.trim() || newName.slice(0, 3)).toUpperCase().slice(0, 4);
      let logo_url: string | null = null;
      if (newLogoFile) {
        logo_url = await uploadLogo(supabase, newLogoFile, `clans/${division.key}-${tag}`);
      }
      const { error } = await supabase.from("clans").insert({
        division_id: division.id,
        name: newName.trim(),
        tag,
        logo_url,
      });
      if (error) throw error;
      setNewName(""); setNewTag(""); setNewLogoFile(null);
      onChanged();
    } catch (e: any) {
      setError(e.message || "Couldn't add clan");
    } finally {
      setBusy(false);
    }
  };

  const removeClan = async (id: string) => {
    const { error } = await supabase.from("clans").delete().eq("id", id);
    if (error) setError(error.message);
    setConfirmDeleteId(null);
    onChanged();
  };

  const startEdit = (c: Clan) => {
    setEditingId(c.id);
    setEditDraft({ name: c.name, tag: c.tag });
    setEditLogoFile(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setBusy(true);
    setError(null);
    try {
      const updates: Record<string, any> = {
        name: editDraft.name.trim(),
        tag: editDraft.tag.trim().toUpperCase().slice(0, 4),
      };
      if (editLogoFile) {
        updates.logo_url = await uploadLogo(supabase, editLogoFile, `clans/${division.key}-${editingId}`);
      }
      const { error } = await supabase.from("clans").update(updates).eq("id", editingId);
      if (error) throw error;
      setEditingId(null);
      onChanged();
    } catch (e: any) {
      setError(e.message || "Couldn't save changes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Users size={15} className="text-cyan-400" /> Clans
        </h3>
        <span className={`text-xs font-mono px-2 py-0.5 rounded ${full ? "text-amber-300 bg-amber-400/10" : "text-slate-400 bg-white/5"}`}>
          {clans.length}/10
        </span>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="space-y-1.5 mb-4">
        {clans.map((c) => (
          <div key={c.id} className="bg-black/20 border border-white/5 rounded-lg px-3 py-2">
            {editingId === c.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <LogoThumb url={c.logo_url} />
                  <input
                    value={editDraft.name}
                    onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                    className="flex-1 min-w-0 bg-black/40 border border-white/15 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-emerald-400/60"
                  />
                  <input
                    value={editDraft.tag}
                    onChange={(e) => setEditDraft((d) => ({ ...d, tag: e.target.value }))}
                    className="w-16 bg-black/40 border border-white/15 rounded px-2 py-1 text-xs uppercase text-slate-100 focus:outline-none focus:border-emerald-400/60"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center gap-2 text-xs text-slate-400 border border-dashed border-white/15 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-emerald-400/40">
                    <Upload size={13} />
                    {editLogoFile ? editLogoFile.name : "Upload clan logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setEditLogoFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <button disabled={busy} onClick={saveEdit} className="p-1.5 rounded text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-50"><Save size={14} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded text-slate-400 hover:bg-white/5"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LogoThumb url={c.logo_url} />
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 tracking-wider shrink-0">{c.tag}</span>
                <span className="flex-1 min-w-0 truncate text-sm text-slate-200">{c.name}</span>
                <button onClick={() => startEdit(c)} className="p-1.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Pencil size={14} /></button>
                {confirmDeleteId === c.id ? (
                  <button onClick={() => removeClan(c.id)} className="text-[11px] px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-300">Confirm?</button>
                ) : (
                  <button onClick={() => setConfirmDeleteId(c.id)} className="p-1.5 rounded text-slate-400 hover:text-red-300 hover:bg-white/5"><Trash2 size={14} /></button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!full && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              placeholder="Clan name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400/60"
            />
            <input
              placeholder="TAG"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-xs uppercase text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center gap-2 text-xs text-slate-400 border border-dashed border-white/15 rounded-lg px-2.5 py-2 cursor-pointer hover:border-emerald-400/40">
              <Upload size={13} />
              {newLogoFile ? newLogoFile.name : "Clan logo (optional)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setNewLogoFile(e.target.files?.[0] || null)}
              />
            </label>
            <button disabled={busy} onClick={addClan} className="p-2 rounded-lg bg-emerald-400/10 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/20 shrink-0 disabled:opacity-50">
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}
      {full && <p className="text-xs text-amber-300/80">Division is full at 10 clans. Remove one to add another.</p>}
    </SectionCard>
  );
}
