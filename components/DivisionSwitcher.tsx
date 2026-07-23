"use client";

import { useRouter } from "next/navigation";
import { Division } from "@/lib/types";
import { themeFor } from "@/lib/theme";

export default function DivisionSwitcher({
  divisions,
  active,
  basePath,
}: {
  divisions: Division[];
  active: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-2.5 mb-5">
      {divisions.map((d) => {
        const t = themeFor(d.key);
        const on = active === d.key;
        return (
          <button
            key={d.key}
            onClick={() => router.push(`${basePath}/${d.key}`)}
            aria-current={on ? "page" : undefined}
            className="flex-1 rounded-2xl px-3 py-3 flex items-center gap-3 transition-colors text-left"
            style={{
              border: `1px solid ${on ? t.accentLine : "var(--hairline)"}`,
              background: on ? t.accentSoft : "var(--panel)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={t.crest}
              alt=""
              className="w-9 h-9 rounded-full object-cover shrink-0 transition-opacity"
              style={{ opacity: on ? 1 : 0.55 }}
            />
            <span className="min-w-0">
              <span
                className="font-ar font-bold text-[13px] sm:text-sm block truncate"
                style={{ color: on ? t.accentHi : "var(--parchment)" }}
              >
                {d.name_ar}
              </span>
              <span
                className="font-display text-[9px] uppercase tracking-[0.2em] block truncate"
                style={{ color: "var(--muted)" }}
              >
                {t.nameEn}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
