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
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-700 transition-colors duration-75 flex flex-col justify-between h-full shadow-subtle group">
      <div>
        {/* Top bar: Avatar, Info & Status */}
        <div className="flex items-start justify-between gap-2.5 mb-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200 font-mono text-xs font-semibold shrink-0 mt-0.5">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-zinc-100 text-sm truncate group-hover:text-blue-400 transition-colors duration-75 leading-tight" title={agent.name}>
                {agent.name}
              </h3>
              <div className="mt-1">
                <span className="inline-block text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/50 leading-none">
                  {agent.role}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 shrink-0 bg-zinc-950/60 border border-zinc-800/80 px-2 py-1 rounded">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-zinc-600"}`}
            ></span>
            <span>{isOnline ? "aktif" : "durduruldu"}</span>
          </div>
        </div>

        {/* Description / Instructions excerpt */}
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3 h-10 overflow-hidden">
          {agent.description || agent.system_instructions}
        </p>

        {/* Model & Tools tags */}
        <div className="space-y-1.5 py-2.5 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center justify-between gap-2 text-zinc-400">
            <span className="text-[11px] text-zinc-500 font-mono shrink-0">Model:</span>
            <span className="truncate font-mono text-[11px] text-zinc-300 max-w-[170px] text-right" title={agent.model_config_data?.primary_model || "anthropic/claude-3.7-sonnet"}>
              {agent.model_config_data?.primary_model || "anthropic/claude-3.7-sonnet"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-zinc-400">
            <span className="text-[11px] text-zinc-500 font-mono shrink-0">Araçlar:</span>
            <span className="text-[11px] text-zinc-400 font-mono">
              {agent.tool_permissions?.allowed_tools?.length || 4} araç
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-zinc-800/80 mt-auto">
        <Link
          href={`/agents/${agent.id}`}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-blue-600 hover:text-white text-zinc-300 rounded-md text-xs font-medium transition-colors duration-75 border border-zinc-700/60 hover:border-blue-500"
        >
          <span>Workspace</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
