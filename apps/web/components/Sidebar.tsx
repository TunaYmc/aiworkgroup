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
    <div className="w-14 shrink-0 h-screen sticky top-0 z-40 bg-zinc-950">
      <aside className="absolute top-0 left-0 h-screen w-14 hover:w-60 bg-zinc-950 border-r border-zinc-800/80 flex flex-col shrink-0 text-zinc-300 select-none transition-[width] duration-200 ease-out overflow-hidden group shadow-none hover:shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-50">
        
        {/* Brand Header */}
        <div className="h-14 flex items-center px-[15px] border-b border-zinc-800/80 gap-3 shrink-0">
          <div className="w-[26px] h-[26px] rounded bg-blue-600 flex items-center justify-center text-white font-semibold text-[11px] tracking-wider shrink-0 shadow-sm">
            YZ
          </div>
          <div className="flex flex-col min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            <span className="font-semibold text-zinc-100 text-sm tracking-tight truncate">
              YapayZeka<span className="text-blue-500">Platform</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wide">
              Enterprise · v2.4
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Platform
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-2 py-2 rounded-md text-xs font-medium transition-colors duration-75 ease-out whitespace-nowrap ${
                  isActive
                    ? "bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-subtle"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
              >
                <div className="w-[22px] flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-500" : "text-zinc-500"}`} />
                </div>
                
                <div className="flex items-center justify-between flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 uppercase shrink-0 ml-2">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

      </aside>
    </div>
  );
}
