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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Organizasyon & Platform Ayarları
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tenant yapılandırması, API anahtarları ve erişim denetimi
        </p>
      </div>

      {/* Organization Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Building2 className="w-5 h-5 text-sky-600" />
          <h2 className="font-bold text-base text-slate-900">Şirket Profili</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Şirket / Organizasyon Adı
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tenant Slug (Benzersiz Tanımlayıcı)
            </label>
            <input
              type="text"
              disabled
              value="tuna-dijital-as-8a21"
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 font-mono"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-sky-500/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saved ? "Kaydedildi!" : "Değişiklikleri Kaydet"}</span>
          </button>
        </div>
      </div>

      {/* API Keys Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-sky-600" />
            <h2 className="font-bold text-base text-slate-900">Programatik API Anahtarları</h2>
          </div>
          <button
            onClick={() => alert("Yeni API Anahtarı oluşturuldu: yzk_live_9f83a8... (Güvenle saklayın)")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Anahtar Üret</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {[
            { name: "ERP & CRM Senkronizasyon Anahtarı", prefix: "yzk_live_7a12", created: "10 Eyl 2026", status: "Aktif" },
            { name: "CI/CD Webhook Entegrasyonu", prefix: "yzk_live_3b88", created: "02 Eyl 2026", status: "Aktif" },
          ].map((k, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">{k.name}</span>
                <span className="font-mono text-slate-400 text-[11px] mt-0.5 block">{k.prefix}••••••••••••</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold">
                  {k.status}
                </span>
                <button className="text-slate-400 hover:text-rose-600 transition p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security and Tenant Isolation Information */}
      <div className="p-5 bg-gradient-to-r from-sky-50 to-white rounded-2xl border border-sky-100 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
          <Shield className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-slate-900">Çok Kiracılı (Multi-Tenant) Mimari Koruması</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Şirketinize ait tüm dökümanlar, vektör indeksleri, LLM sohbet geçmişleri ve Docker sandbox çalışma alanları diğer şirketlerden tamamen izole edilmiştir. Verileriniz hiçbir dış şirkete ya da LLM eğitim havuzuna aktarılmaz.
          </p>
        </div>
      </div>
    </div>
  );
}
