"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { getApiUrl } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setLoading(true);

    try {
      const apiUrl = getApiUrl();
      const loginUrl = `${apiUrl}/auth/login`;
      
      let res;
      try {
        res = await fetch(loginUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: loginPass }),
        });
      } catch (fetchErr: any) {
        throw new Error(`Bağlantı hatası: Sunucuya ulaşılamadı. Adres: ${loginUrl}. Detay: ${fetchErr.message}`);
      }

      if (!res.ok) {
        let errData = {};
        try {
          errData = await res.json();
        } catch (e) {
          // ignore json parse error
        }
        throw new Error((errData as any).detail || `HTTP Hata ${res.status}: Sunucu isteği reddetti.`);
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      if (data.current_organization_id) {
        localStorage.setItem("currentOrgId", data.current_organization_id);
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-zinc-300">
      <div className="max-w-sm w-full bg-zinc-900 rounded-lg border border-zinc-800 p-6 shadow-card space-y-5">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-semibold text-xs tracking-wider">
            YZ
          </div>
          <h1 className="text-base font-semibold text-zinc-100 tracking-tight">
            YapayZeka<span className="text-blue-500">Platform</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Kurumsal Yönetim Masası Girişi
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-md text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              İş E-postası
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ad.soyad@sirket.com"
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              Şifre
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 hover-glow disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors duration-75 cursor-pointer shadow-subtle"
          >
            <span>{loading ? "Giriş Yapılıyor..." : "Giriş Yap"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Demo Access Section */}
        <div className="pt-3 border-t border-zinc-800 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 text-center">
            Hızlı Test Girişi
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => executeLogin("demo@acme.com", "Demo12345!")}
              disabled={loading}
              className="w-full py-2 px-2.5 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 rounded-md text-xs font-medium flex items-center justify-between transition-colors duration-75 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center justify-center text-[10px] font-mono">TD</span>
                <span className="text-left">
                  <span className="block text-zinc-200">Tuna Demir</span>
                  <span className="block text-[10px] font-mono text-zinc-500">demo@acme.com</span>
                </span>
              </div>
              <span className="text-[11px] font-mono text-blue-400">Giriş →</span>
            </button>

            <button
              type="button"
              onClick={() => executeLogin("admin@platform.com", "Admin12345!")}
              disabled={loading}
              className="w-full py-2 px-2.5 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 rounded-md text-xs font-medium flex items-center justify-between transition-colors duration-75 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center justify-center text-[10px] font-mono">AD</span>
                <span className="text-left">
                  <span className="block text-zinc-200">Platform Admin</span>
                  <span className="block text-[10px] font-mono text-zinc-500">admin@platform.com</span>
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Giriş →</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-2 border-t border-zinc-800 text-xs text-zinc-400">
          Hesabınız yok mu?{" "}
          <Link href="/register" className="font-medium text-blue-400 hover:text-blue-300">
            Kayıt Açın
          </Link>
        </div>
      </div>
    </div>
  );
}
