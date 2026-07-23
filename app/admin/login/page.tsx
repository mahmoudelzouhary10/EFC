"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SectionCard } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/admin/dashboard");
    router.refresh();
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <SectionCard className="p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-400/10 border border-emerald-400/40 flex items-center justify-center mx-auto mb-3">
          <Lock size={20} className="text-emerald-300" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">Admin Access</h2>
        <p className="text-xs text-slate-500 mb-4">
          Sign in with the federation admin account to manage clans, fixtures, and results.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 text-center focus:outline-none focus:border-emerald-400/60"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 text-center focus:outline-none focus:border-emerald-400/60"
          />
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1 justify-center">
              <AlertTriangle size={12} /> {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/50 text-emerald-300 text-sm font-semibold hover:bg-emerald-400/20 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Unlock Dashboard"}
          </button>
        </form>
        <p className="text-[10px] text-slate-600 mt-4">
          No account yet? Create one in Supabase Dashboard → Authentication → Users. See README for steps.
        </p>
      </SectionCard>
    </div>
  );
}
