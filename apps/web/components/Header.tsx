"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, ChevronDown, Bell, Search, LogIn, LogOut } from "lucide-react";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentOrgId");
    setIsLoggedIn(false);
    window.location.href = "/login";
  };

  return (
    <header className="h-14 bg-zinc-950/80 backdrop-blur border-b border-zinc-800/80 px-6 md:px-8 flex items-center justify-between sticky top-0 z-10">
      {/* Organization Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60 transition-colors duration-75 cursor-pointer text-zinc-300 text-xs font-medium">
          <Building2 className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-200">Tuna Dijital A.Ş.</span>
          <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-1 py-0.5 rounded">
            org
          </span>
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        </div>

        {/* Global Search */}
        <div className="relative hidden md:block w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Ajan, görev veya döküman ara..."
            className="w-full pl-8 pr-3 py-1 text-xs bg-zinc-900/80 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors duration-75"
          />
        </div>
      </div>

      {/* Right Action Icons & Status */}
      <div className="flex items-center gap-3">
        {/* System Health Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-[11px] text-zinc-400">Operational</span>
        </div>

        {/* Notifications */}
        <button className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-900 transition-colors duration-75 relative">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
        </button>

        {/* User Profile / Auth State */}
        {isLoggedIn ? (
          <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-800">
            <div className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] font-semibold flex items-center justify-center border border-zinc-700/60">
              TD
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-medium text-zinc-200 leading-none">Tuna Demir</span>
              <span className="text-[10px] font-mono text-zinc-500">admin</span>
            </div>
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-md hover:bg-zinc-900 transition-colors duration-75 ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <Link
              href="/login"
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 hover-glow text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors duration-75"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Giriş Yap</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
