"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  CheckSquare,
  FolderKanban,
  Cpu,
  BarChart3,
  Settings,
  ShieldCheck,
  Sparkles
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "AI Çalışanlar", icon: Bot },
  { href: "/tasks", label: "Görev Havuzu", icon: CheckSquare },
  { href: "/files", label: "Dökümanlar & RAG", icon: FolderKanban },
  { href: "/models", label: "Model Kataloğu", icon: Cpu },
  { href: "/usage", label: "Kullanım & Maliyet", icon: BarChart3 },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-base leading-tight tracking-tight">
            YapayZeka<span className="text-sky-600">Çalışan</span>
          </span>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            Kurumsal AI Platformu
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Yönetim Masası
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-sky-50 text-sky-700 font-semibold shadow-xs border border-sky-100"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Isolation Status Indicator */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 m-3 rounded-xl border border-slate-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Tenant İzolasyonu</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          PostgreSQL RLS & izole Docker sandbox ortamı aktif.
        </p>
      </div>
    </aside>
  );
}
