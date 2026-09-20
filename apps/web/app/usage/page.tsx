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
    <div className="space-y-6 max-w-7xl mx-auto text-zinc-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Kullanım & Maliyet
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              analytics
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Token tüketimi, model harcamaları ve organizasyon bütçe kontrolleri.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4.5 shadow-subtle">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">Toplam Token</span>
          <span className="text-xl font-semibold text-zinc-100 font-mono mt-1.5 block">
            {(summary.total_tokens / 1000000).toFixed(2)}M
          </span>
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-1.5">
            <span>Giriş: {(summary.input_tokens / 1000).toFixed(0)}k</span>
            <span>·</span>
            <span>Çıkış: {(summary.output_tokens / 1000).toFixed(0)}k</span>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4.5 shadow-subtle">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">Tahmini Harcama</span>
          <span className="text-xl font-semibold text-blue-400 font-mono mt-1.5 block">
            ${summary.estimated_cost_usd.toFixed(2)}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 mt-1.5 block">
            Aylık $100.00 kotasının %{((summary.estimated_cost_usd / 100) * 100).toFixed(1)}'i
          </span>
        </div>

        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4.5 shadow-subtle">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">Bütçe Koruması</span>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-sm font-medium text-zinc-200">Aktif</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1.5 block leading-normal">
            Limit aşımında çağrılar otomatik sınırlandırılır
          </span>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Model */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4.5 shadow-subtle space-y-3">
          <h3 className="font-medium text-xs text-zinc-100">Modellere Göre Dağılım</h3>
          <div className="space-y-2.5">
            {Object.entries(summary.by_model).map(([model, tokens]) => {
              const pct = ((tokens / summary.total_tokens) * 100).toFixed(0);
              return (
                <div key={model} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-400 truncate max-w-[220px]">{model}</span>
                    <span className="text-zinc-200">
                      {(tokens / 1000).toFixed(0)}k (%{pct})
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Agent */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4.5 shadow-subtle space-y-3">
          <h3 className="font-medium text-xs text-zinc-100">Ajanlara Göre Dağılım</h3>
          <div className="space-y-2.5">
            {Object.entries(summary.by_agent).map(([agentName, tokens]) => {
              const pct = ((tokens / summary.total_tokens) * 100).toFixed(0);
              return (
                <div key={agentName} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-400">{agentName}</span>
                    <span className="text-zinc-200">
                      {(tokens / 1000).toFixed(0)}k (%{pct})
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${pct}%` }}></div>
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
