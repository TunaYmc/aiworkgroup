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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-card space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            YapayZeka<span className="text-sky-600">Çalışan</span>
          </h1>
          <p className="text-xs text-slate-500">
            Kurumsal AI Operasyon Paneline Giriş Yapın
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              İş E-postası
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ad.soyad@sirket.com"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Şifre
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm shadow-sky-500/20 cursor-pointer"
          >
            <span>{loading ? "Giriş Yapılıyor..." : "Giriş Yap"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Access Section */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
            ⚡ Tek Tıkla Hızlı Test Girişi
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => executeLogin("demo@acme.com", "Demo12345!")}
              disabled={loading}
              className="w-full py-2.5 px-3 bg-sky-50 hover:bg-sky-100/80 border border-sky-200 text-sky-800 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">TD</span>
                <span className="text-left">
                  <span className="block font-bold">Tuna Demir (Demo Şirket)</span>
                  <span className="block text-[10px] text-sky-600">demo@acme.com</span>
                </span>
              </div>
              <span className="text-[11px] font-bold text-sky-600">Hızlı Giriş →</span>
            </button>

            <button
              type="button"
              onClick={() => executeLogin("admin@platform.com", "Admin12345!")}
              disabled={loading}
              className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">AD</span>
                <span className="text-left">
                  <span className="block font-bold">Platform Admin</span>
                  <span className="block text-[10px] text-slate-500">admin@platform.com</span>
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500">Hızlı Giriş →</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          Henüz şirket hesabınız yok mu?{" "}
          <Link href="/register" className="font-bold text-sky-600 hover:text-sky-700 underline">
            Yeni Şirket Kaydı Açın
          </Link>
        </div>
      </div>
    </div>
  );
}
