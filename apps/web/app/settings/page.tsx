"use client";

import React, { useState } from "react";
import { Building2, Key, Users, Shield, Save, Plus, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("Tuna Dijital A.Ş.");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-zinc-300">
      {/* Header */}
      <div className="space-y-2 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
            Ayarlar
          </h1>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            config
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Organizasyon parametreleri, API anahtarları ve güvenlik izinleri.
        </p>
      </div>

      {/* Organization Info Card */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4.5 shadow-subtle space-y-3.5">
        <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
          <Building2 className="w-4 h-4 text-zinc-400" />
          <h2 className="font-medium text-xs text-zinc-100">Organizasyon Profili</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              Şirket / Organizasyon Adı
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              Tenant Slug
            </label>
            <input
              type="text"
              disabled
              value="tuna-dijital-as-8a21"
              className="w-full px-3 py-1.5 bg-zinc-950/40 border border-zinc-800 rounded-md text-xs text-zinc-500 font-mono"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors duration-75 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saved ? "Kaydedildi" : "Kaydet"}</span>
          </button>
        </div>
      </div>

      {/* API Keys Card */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4.5 shadow-subtle space-y-3.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-zinc-400" />
            <h2 className="font-medium text-xs text-zinc-100">Programatik API Anahtarları</h2>
          </div>
          <button
            onClick={() => alert("Yeni API Anahtarı üretildi: yzk_live_9f83a8...")}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 rounded text-xs font-medium transition-colors duration-75"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Anahtar</span>
          </button>
        </div>

        <div className="divide-y divide-zinc-800/80 text-xs">
          {[
            { name: "ERP & CRM Entegrasyonu", prefix: "yzk_live_7a12", created: "10 Eyl 2026", status: "active" },
            { name: "CI/CD Webhook Erişimi", prefix: "yzk_live_3b88", created: "02 Eyl 2026", status: "active" },
          ].map((k, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-medium text-xs text-zinc-200 block">{k.name}</span>
                <span className="font-mono text-zinc-500 text-[11px] mt-0.5 block">{k.prefix}••••••••••••</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{k.status}</span>
                </span>
                <button className="text-zinc-500 hover:text-rose-400 transition-colors duration-75 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security and Tenant Isolation Information */}
      <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 flex items-start gap-3">
        <Shield className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <h3 className="font-medium text-xs text-zinc-200">Multi-Tenant İzolasyon Mimarisi</h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Dökümanlar, vektör indeksleri, LLM hafıza kayıtları ve Docker sandbox çalışma alanları PostgreSQL RLS ile tenant bazında tamamen izole edilmiştir. Verileriniz model eğitim havuzlarına iletilmez.
          </p>
        </div>
      </div>
    </div>
  );
}
