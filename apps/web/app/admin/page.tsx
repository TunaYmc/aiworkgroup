"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Building2, Bot, CheckSquare, BarChart3, Activity, Users, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function AdminPage() {
  const [stats, setStats] = useState({
    total_organizations: 12,
    total_users: 38,
    total_agents: 24,
    total_tasks: 156,
    active_running_tasks: 3,
    total_tokens_consumed: 14200000,
    total_platform_cost_usd: 42.60,
    system_health: {
      api: "healthy",
      worker_queue: "operational",
      runtime_harness: "openclaw-gateway-ready"
    }
  });

  const [orgs, setOrgs] = useState([
    { id: "org-1", name: "Tuna Dijital A.Ş.", slug: "tuna-dijital-as", agents: 3, tasks: 42, plan: "Enterprise" },
    { id: "org-2", name: "Riva Karavan Ltd.", slug: "riva-karavan", agents: 2, tasks: 28, plan: "Pro" },
    { id: "org-3", name: "StockCamper Global", slug: "stockcamper", agents: 4, tasks: 86, plan: "Enterprise" },
  ]);

  useEffect(() => {
    api.get<any>("/admin/overview").then((data) => {
      setStats(data);
    }).catch(() => {
      // Fallback preview
    });
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-zinc-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Platform Yönetimi
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              admin
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tenant yönetimi, worker kuyrukları ve global kota kontrolleri.
          </p>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>System Nominal</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Toplam Tenant", value: stats.total_organizations },
          { label: "Toplam Ajan", value: stats.total_agents },
          { label: "Yürütülen Görevler", value: stats.total_tasks },
          { label: "Global Maliyet", value: `$${stats.total_platform_cost_usd.toFixed(2)}` },
        ].map((item, idx) => {
          return (
            <div key={idx} className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 shadow-subtle space-y-1.5">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">{item.label}</span>
              <span className="text-xl font-semibold text-zinc-100 font-mono block">{item.value}</span>
            </div>
          );
        })}
      </div>

      {/* Organizations Table */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-medium text-zinc-100">Organizasyonlar & Tenant İzolasyonu</h2>
          <span className="text-[11px] font-mono text-zinc-500">PostgreSQL RLS & Sandbox</span>
        </div>

        <div className="divide-y divide-zinc-800/80 text-xs">
          <div className="grid grid-cols-5 p-3 bg-zinc-950/60 font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            <span className="col-span-2">Şirket</span>
            <span>Slug / ID</span>
            <span>Ajan Sayısı</span>
            <span className="text-right">Durum</span>
          </div>

          {orgs.map((org) => (
            <div key={org.id} className="grid grid-cols-5 p-3 items-center hover:bg-zinc-800/30 transition-colors duration-75">
              <div className="col-span-2 flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] font-semibold border border-zinc-700/60 flex items-center justify-center shrink-0">
                  {org.name[0]}
                </div>
                <div>
                  <span className="font-medium text-xs text-zinc-200 block">{org.name}</span>
                  <span className="text-[10px] font-mono text-zinc-500">{org.plan}</span>
                </div>
              </div>

              <span className="font-mono text-zinc-400 text-[11px]">{org.slug}</span>
              <span className="font-mono text-zinc-300 text-[11px]">{org.agents} Ajan</span>

              <div className="flex items-center justify-end gap-1.5 text-[11px] font-mono text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>isolated</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
