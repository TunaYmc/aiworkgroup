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
    <div className="w-full max-w-7xl space-y-6 text-zinc-300">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800 space-y-1">
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
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5 shadow-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
          <h2 className="font-medium text-xs text-zinc-100">Organizasyon Profili</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Şirket / Organizasyon Adı
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Tenant Slug
            </label>
            <input
              type="text"
              disabled
              value="tuna-dijital-as-8a21"
              className="w-full h-9 px-3 bg-zinc-950/40 border border-zinc-800/80 rounded-md text-xs text-zinc-500 font-mono cursor-not-allowed"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            Parametreler organizasyon sandbox alanına anında uygulanır
          </span>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors duration-75 cursor-pointer shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saved ? "Kaydedildi" : "Kaydet"}</span>
          </button>
        </div>
      </div>

      {/* API Keys Card */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-zinc-400 shrink-0" />
            <h2 className="font-medium text-xs text-zinc-100">Programatik API Anahtarları</h2>
          </div>
          <button
            onClick={() => alert("Yeni API Anahtarı üretildi: yzk_live_9f83a8...")}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 rounded text-xs font-medium transition-colors duration-75 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Anahtar</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {/* Aligned Table Header */}
          <div className="grid grid-cols-12 gap-3 pb-2.5 border-b border-zinc-800/80 text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1">
            <div className="col-span-5">Anahtar Tanımı</div>
            <div className="col-span-3">Oluşturulma Tarihi</div>
            <div className="col-span-2 text-center">Durum</div>
            <div className="col-span-2 text-right">İşlem</div>
          </div>

          {/* Aligned Table Rows */}
          <div className="divide-y divide-zinc-800/60 text-xs">
            {[
              { name: "ERP & CRM Entegrasyonu", prefix: "yzk_live_7a12", created: "10 Eyl 2026", status: "active" },
              { name: "CI/CD Webhook Erişimi", prefix: "yzk_live_3b88", created: "02 Eyl 2026", status: "active" },
            ].map((k, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 py-3 items-center px-1">
                <div className="col-span-5 min-w-0">
                  <span className="font-medium text-xs text-zinc-200 block truncate">{k.name}</span>
                  <span className="font-mono text-zinc-500 text-[11px] mt-0.5 block">{k.prefix}••••••••••••</span>
                </div>
                <div className="col-span-3 text-zinc-400 font-mono text-[11px]">
                  {k.created}
                </div>
                <div className="col-span-2 flex justify-center">
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>{k.status}</span>
                  </span>
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    title="Anahtarı Sil"
                    className="text-zinc-500 hover:text-rose-400 transition-colors duration-75 p-1 rounded hover:bg-zinc-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security and Tenant Isolation Information */}
      <div className="p-5 bg-zinc-900 rounded-lg border border-zinc-800 flex items-start gap-3.5">
        <Shield className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h3 className="font-medium text-xs text-zinc-200">Multi-Tenant İzolasyon Mimarisi</h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Dökümanlar, vektör indeksleri, LLM hafıza kayıtları ve Docker sandbox çalışma alanları PostgreSQL RLS ile tenant bazında tamamen izole edilmiştir. Verileriniz model eğitim havuzlarına iletilmez.
          </p>
        </div>
      </div>
    </div>
  );
}
