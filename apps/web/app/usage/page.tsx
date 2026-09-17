"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, DollarSign, Cpu, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";
import { api, UsageSummary } from "@/lib/api";

export default function UsagePage() {
  const [summary, setSummary] = useState<UsageSummary>({
    total_tokens: 2450000,
    input_tokens: 1850000,
    output_tokens: 600000,
    estimated_cost_usd: 7.20,
    period: "Eylül 2026",
    by_model: {
      "anthropic/claude-3.7-sonnet": 1600000,
      "openai/gpt-4o-mini": 550000,
      "deepseek/deepseek-r1": 300000
    },
    by_agent: {
      "Selin (Satış)": 1400000,
      "Kemal (Muhasebe)": 650000,
      "Defne (Araştırma)": 400000
    }
  });

  useEffect(() => {
    api.get<UsageSummary>("/usage/summary").then((res) => {
      setSummary(res);
    }).catch(() => {
      // Retain fallback data
    });
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Kullanım & Maliyet Yönetimi
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tüm AI personellerinizin token tüketimi, model harcamaları ve organizasyon bütçe kontrolleri
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">Toplam Token Tüketimi</span>
          <span className="text-3xl font-black text-slate-900 mt-2 block">
            {(summary.total_tokens / 1000000).toFixed(2)}M
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
            <span>Giriş: {(summary.input_tokens / 1000).toFixed(0)}k</span>
            <span>•</span>
            <span>Çıkış: {(summary.output_tokens / 1000).toFixed(0)}k</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">Tahmini Harcama</span>
          <span className="text-3xl font-black text-sky-600 mt-2 block">
            ${summary.estimated_cost_usd.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400 mt-2 block">
            Aylık $100.00 bütçe kotasının %{((summary.estimated_cost_usd / 100) * 100).toFixed(1)}'i
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">Organizasyon Bütçe Koruması</span>
          <span className="text-3xl font-black text-emerald-600 mt-2 block">Aktif</span>
          <span className="text-xs text-slate-400 mt-2 block">
            Limit aşımında model çağrıları otomatik olarak kısıtlanır
          </span>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Model */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900">Modellere Göre Dağılım</h3>
          <div className="space-y-3">
            {Object.entries(summary.by_model).map(([model, tokens]) => {
              const pct = ((tokens / summary.total_tokens) * 100).toFixed(0);
              return (
                <div key={model} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-700">{model}</span>
                    <span className="font-bold text-slate-900">
                      {(tokens / 1000).toFixed(0)}k token (%{pct})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Agent */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900">AI Personellere Göre Dağılım</h3>
          <div className="space-y-3">
            {Object.entries(summary.by_agent).map(([agentName, tokens]) => {
              const pct = ((tokens / summary.total_tokens) * 100).toFixed(0);
              return (
                <div key={agentName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{agentName}</span>
                    <span className="font-bold text-slate-900">
                      {(tokens / 1000).toFixed(0)}k token (%{pct})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
