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
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
      {/* Organization Switcher */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition cursor-pointer text-slate-800">
          <Building2 className="w-4 h-4 text-sky-600" />
          <span className="text-sm font-semibold">Tuna Dijital A.Ş.</span>
          <span className="text-[11px] bg-sky-100 text-sky-700 font-medium px-2 py-0.5 rounded-full">
            Kurumsal
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Global Search */}
        <div className="relative hidden md:block w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Agent, görev veya döküman ara..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          />
        </div>
      </div>

      {/* Right Action Icons & Status */}
      <div className="flex items-center gap-4">
        {/* System Health Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sistemler Çevrimiçi</span>
        </div>

        {/* Notifications */}
        <button className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-500 rounded-full"></span>
        </button>

        {/* User Profile / Auth State */}
        {isLoggedIn ? (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs border border-sky-200">
              TD
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-slate-900 leading-none">Tuna Demir</span>
              <span className="text-[11px] text-slate-400">Yönetici</span>
            </div>
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <Link
              href="/login"
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-sky-500/20 transition"
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
