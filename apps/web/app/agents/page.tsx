"use client";

import React, { useState, useEffect } from "react";
import { Bot, Plus, Search, Filter, Sparkles } from "lucide-react";
import AgentCard from "@/components/AgentCard";
import CreateAgentModal from "@/components/CreateAgentModal";
import { api, Agent } from "@/lib/api";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAgents = async () => {
    try {
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Şirket AI Personelleri
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            İzole çalışma alanlarına ve özelleştirilmiş araçlara sahip dijital çalışanlar
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-sky-500/25 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni AI Çalışan Oluştur</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim veya uzmanlık alanına göre filtrele..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full sm:w-auto"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      <CreateAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAgents}
      />
    </div>
  );
}
