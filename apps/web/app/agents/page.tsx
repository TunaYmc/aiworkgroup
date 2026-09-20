"use client";

import React, { useState, useEffect } from "react";
import { Bot, Plus, Search, Filter, Sparkles } from "lucide-react";
import AgentCard from "@/components/AgentCard";
import CreateAgentModal from "@/components/CreateAgentModal";
import { SkeletonCard } from "@/components/Skeleton";
import { api, Agent } from "@/lib/api";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await api.get<Agent[]>("/agents");
      setAgents(res);
    } catch {
      // Fallback
      setAgents([
        {
          id: "agent-1",
          organization_id: "org-1",
          name: "Selin - Satış & Teklif Uzmanı",
          role: "Sales Employee",
          description: "Müşteri teklifleri oluşturur, CRM fırsatlarını değerlendirir ve e-posta taslakları hazırlar.",
          system_instructions: "Satış ekibinin teklif ve operasyon süreçlerini hızlandır.",
          status: "active",
          model_config_data: { primary_model: "anthropic/claude-3.7-sonnet" },
          tool_permissions: { allowed_tools: ["file_search", "file_read", "file_write", "web_search"], denied_tools: [] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "agent-2",
          organization_id: "org-1",
          name: "Kemal - Muhasebe & Denetim",
          role: "Accounting Employee",
          description: "Gider faturalarını kontrol eder, KDV & vergi hesaplamalarını yapar ve finansal raporlar sunar.",
          system_instructions: "Muhasebe kayıtlarını titizlikle incele ve vergi mevzuatına uyumlu çalış.",
          status: "active",
          model_config_data: { primary_model: "deepseek/deepseek-r1" },
          tool_permissions: { allowed_tools: ["file_search", "python", "file_read"], denied_tools: [] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "agent-3",
          organization_id: "org-1",
          name: "Defne - Pazar & Rakip Araştırması",
          role: "Research Employee",
          description: "Teknoloji ve pazar trendlerini inceler, web taraması yapar ve şirket içi brifing üretir.",
          system_instructions: "En güncel piyasa dinamiklerini ve rakipleri analiz et.",
          status: "active",
          model_config_data: { primary_model: "openai/gpt-4o" },
          tool_permissions: { allowed_tools: ["web_search", "browser", "file_write"], denied_tools: [] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const filteredAgents = agents.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || a.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="w-full max-w-7xl space-y-6 text-zinc-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Ajan Servisleri
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              agents
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            İzole çalışma alanlarına ve sandbox araçlarına sahip kurumsal servisler.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors duration-75 shadow-subtle cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Yeni Ajan Servisi</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim veya uzmanlık alanına göre filtrele..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors duration-75 h-8"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0 hidden sm:block" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-300 focus:outline-none focus:border-blue-500 w-full sm:w-auto font-mono h-8"
          >
            <option value="all">Tüm Roller</option>
            <option value="Sales Employee">Satış & Müşteri</option>
            <option value="Accounting Employee">Muhasebe & Finans</option>
            <option value="Research Employee">Pazar Araştırması</option>
            <option value="HR Employee">İnsan Kaynakları</option>
            <option value="Operations Employee">Operasyon</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {filteredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
            {filteredAgents.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-zinc-500 font-mono bg-zinc-900/50 rounded-lg border border-zinc-800/80">
                Arama kriterlerine uygun ajan servisi bulunamadı.
              </div>
            )}
          </>
        )}
      </div>

      <CreateAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAgents}
      />
    </div>
  );
}
