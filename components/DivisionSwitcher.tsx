"use client";

import { useRouter } from "next/navigation";
import { Division } from "@/lib/types";

export default function DivisionSwitcher({
  divisions,
  active,
  basePath,
}: {
  divisions: Division[];
  active: string;
  basePath: string; // e.g. "/league" or "/admin/dashboard"
}) {
  const router = useRouter();

  return (
    <div className="flex gap-2 mb-4">
      {divisions.map((d) => (
        <button
          key={d.key}
          onClick={() => router.push(`${basePath}/${d.key}`)}
          className={`flex-1 relative rounded-xl border px-4 py-3 text-left transition-all ${
            active === d.key
              ? "border-emerald-400/50 bg-emerald-400/[0.06]"
              : "border-white/10 bg-[#101720] hover:border-white/20"
          }`}
        >
          <div className={`font-display font-bold text-sm tracking-wide ${active === d.key ? "text-emerald-300" : "text-slate-300"}`}>
            {d.name}
          </div>
          <div className="text-[11px] text-slate-500">{d.name_ar}</div>
          {active === d.key && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
