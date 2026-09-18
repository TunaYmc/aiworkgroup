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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Platform Süper Yönetici Masası (Admin)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 tracking-wider">
                MOCK / TASLAK
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tüm şirket tenant'ları, worker kuyrukları ve global model bütçe kontrolü
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sistem Sağlığı: %100 Çalışır Durumda</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Toplam Şirket (Tenant)", value: stats.total_organizations, icon: Building2, color: "text-sky-600 bg-sky-50" },
          { label: "Toplam AI Çalışan", value: stats.total_agents, icon: Bot, color: "text-indigo-600 bg-indigo-50" },
          { label: "Yürütülen Görevler", value: stats.total_tasks, icon: CheckSquare, color: "text-emerald-600 bg-emerald-50" },
          { label: "Global Token / Maliyet", value: `$${stats.total_platform_cost_usd.toFixed(2)}`, icon: BarChart3, color: "text-amber-600 bg-amber-50" },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">{item.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-black text-slate-900 block">{item.value}</span>
            </div>
          );
        })}
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Aktif Organizasyonlar & Tenant İzolasyonu</h2>
          <span className="text-xs text-slate-400">PostgreSQL RLS ve Docker Sandbox Korumalı</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="grid grid-cols-5 p-4 bg-slate-50/70 font-bold text-slate-500 uppercase tracking-wider">
            <span className="col-span-2">Şirket Adı</span>
            <span>Slug / ID</span>
            <span>AI Personeller</span>
            <span className="text-right">Durum</span>
          </div>

          {orgs.map((org) => (
            <div key={org.id} className="grid grid-cols-5 p-4 items-center hover:bg-slate-50/50 transition">
              <div className="col-span-2 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold">
                  {org.name[0]}
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">{org.name}</span>
                  <span className="text-[11px] text-slate-400">{org.plan} Plan</span>
                </div>
              </div>

              <span className="font-mono text-slate-600">{org.slug}</span>
              <span className="font-semibold text-slate-800">{org.agents} Aktif Agent</span>

              <div className="text-right">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold text-[11px]">
                  İzole & Güvenli
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
