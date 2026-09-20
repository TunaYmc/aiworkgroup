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
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Servisler / Ajanlar", icon: Bot },
  { href: "/tasks", label: "Görevler", icon: CheckSquare, badge: "dev" },
  { href: "/files", label: "Dökümanlar", icon: FolderKanban },
  { href: "/models", label: "Modeller", icon: Cpu },
  { href: "/usage", label: "Kullanım", icon: BarChart3, badge: "dev" },
  { href: "/settings", label: "Ayarlar", icon: Settings, badge: "dev" },
  { href: "/admin", label: "Yönetim", icon: ShieldCheck, badge: "dev" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-zinc-950 border-r border-zinc-800/80 flex flex-col shrink-0 h-screen sticky top-0 text-zinc-300 select-none">
      {/* Brand Header */}
      <div className="h-14 flex items-center px-5 border-b border-zinc-800/80 gap-2.5">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-semibold text-xs tracking-wider shrink-0">
          YZ
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-zinc-100 text-sm tracking-tight truncate">
            YapayZeka<span className="text-blue-500">Platform</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-mono tracking-wide">
            Enterprise · v2.4
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto">
        <div className="px-2.5 pb-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          Platform
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-75 ease-out ${
                isActive
                  ? "bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-subtle"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-500" : "text-zinc-500"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 uppercase">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Isolation Status Indicator */}
      <div className="p-3 m-2.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
          <span>Tenant İzolasyonu</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
          PostgreSQL RLS & Sandbox aktif
        </p>
      </div>
    </aside>
  );
}
