"use client";

import React from "react";
import Link from "next/link";
import { Bot, Sparkles, MessageSquare, ArrowRight, Wrench, Cpu } from "lucide-react";
import { Agent } from "@/lib/api";

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const isOnline = agent.status === "active";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between group">
      <div>
        {/* Top bar: Avatar & Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-100 flex items-center justify-center text-sky-700 font-bold text-lg border border-sky-200 shadow-xs">
              <Bot className="w-6 h-6 text-sky-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-600 transition">
                {agent.name}
              </h3>
              <span className="inline-block text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 mt-0.5">
                {agent.role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
            <span
              className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`}
            ></span>
            <span>{isOnline ? "Hazır" : "Durduruldu"}</span>
          </div>
        </div>

        {/* Description / Instructions excerpt */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
          {agent.description || agent.system_instructions}
        </p>

        {/* Model & Tools tags */}
        <div className="space-y-2 py-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Cpu className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="truncate font-mono text-[11px] text-slate-700">
              {agent.model_config_data?.primary_model || "anthropic/claude-3.7-sonnet"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Wrench className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="text-[11px] text-slate-500">
              {agent.tool_permissions?.allowed_tools?.length || 4} Yetkili Araç
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
        <Link
          href={`/agents/${agent.id}`}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-semibold transition border border-sky-200"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Sohbet / Çalışma Alanı</span>
        </Link>
      </div>
    </div>
  );
}
