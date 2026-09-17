"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  CheckSquare,
  FolderKanban,
  Zap,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  ShieldAlert,
  Activity
} from "lucide-react";
import AgentCard from "@/components/AgentCard";
import CreateAgentModal from "@/components/CreateAgentModal";
import { api, Agent, Task } from "@/lib/api";

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentsData, tasksData] = await Promise.allSettled([
        api.get<Agent[]>("/agents"),
        api.get<Task[]>("/tasks"),
      ]);

      if (agentsData.status === "fulfilled") {
        setAgents(agentsData.value);
      } else {
        // Mock fallback for immediate initial presentation
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

      if (tasksData.status === "fulfilled") {
        setTasks(tasksData.value);
      } else {
        setTasks([
          {
            id: "task-1",
            organization_id: "org-1",
            agent_id: "agent-1",
            title: "Q3 Kurumsal Satış Teklif Dosyası Hazırlığı",
            status: "completed",
            priority: "high",
            input_prompt: "Riva ve Stockcamper için Q3 kurumsal filo teklif dokümanını oluştur.",
            output_result: "PDF teklif taslağı ve Excel maliyet tablosu hazırlandı.",
            artifacts: ["Q3_Teklif_Raporu.pdf"],
            created_at: "10 dakika önce",
          },
          {
            id: "task-2",
            organization_id: "org-1",
            agent_id: "agent-2",
            title: "Ağustos Ayı Gider Faturaları Denetimi",
            status: "running",
            priority: "normal",
            input_prompt: "Yüklenen 42 adet PDF faturayı inceleyip toplam KDV matrahını hesapla.",
            artifacts: [],
            created_at: "3 dakika önce",
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    fetchData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Auth Warning for Demo Visitors */}
      {!isLoggedIn && (
        <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block">Canlı Ajan Bağlantısı İçin Oturum Açın</span>
              <span className="text-amber-700">Ajanlarla canlı sohbet etmek, görev başlatmak ve dosyalarınızı işlemek için lütfen giriş yapın.</span>
            </div>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-sm shadow-amber-600/20"
          >
            Hızlı Giriş Yap →
          </Link>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 p-6 rounded-2xl border border-sky-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-sky-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-sky-500" />
            <span>Kurumsal Dijital İş Gücü</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Şirket Operasyon Merkezi
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bağımsız çalışan dijital personellerinizi yönetin, görev atayın ve sonuçları izleyin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-sky-500/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni AI Çalışan Oluştur</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Aktif AI Çalışanlar",
            value: agents.length.toString(),
            change: "+1 bu hafta",
            icon: Bot,
            color: "text-sky-600 bg-sky-50 border-sky-100",
          },
          {
            label: "Devam Eden Görevler",
            value: tasks.filter(t => t.status === "running").length.toString(),
            change: "Gerçek zamanlı yürütülüyor",
            icon: Zap,
            color: "text-amber-600 bg-amber-50 border-amber-100",
          },
          {
            label: "İşlenen Dökümanlar (RAG)",
            value: "148 Dosya",
            change: "pgvector indeksli",
            icon: FolderKanban,
            color: "text-indigo-600 bg-indigo-50 border-indigo-100",
          },
          {
            label: "Aylık Token Tüketimi",
            value: "2.4M Token",
            change: "%24 Bütçe kullanıldı ($7.20)",
            icon: TrendingUp,
            color: "text-emerald-600 bg-emerald-50 border-emerald-100",
          },
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">{metric.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${metric.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{metric.value}</span>
                <p className="text-[11px] text-slate-400 mt-1">{metric.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Employees Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Şirket AI Çalışanları</h2>
            <span className="text-xs bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-semibold border border-sky-100">
              {agents.length} Personel
            </span>
          </div>
          <Link
            href="/agents"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition"
          >
            <span>Tümünü Gör</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Recent Tasks & Execution Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Son Yürütülen Görevler</h2>
              <p className="text-xs text-slate-400">Sandbox ve arka plan worker işleyişi</p>
            </div>
          </div>
          <Link
            href="/tasks"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition"
          >
            <span>Görev Havuzuna Git</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const isCompleted = task.status === "completed";
            const isRunning = task.status === "running";
            return (
              <div key={task.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      isCompleted
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : isRunning
                        ? "bg-sky-50 text-sky-600 border border-sky-200 animate-pulse"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isCompleted ? "✓" : "●"}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{task.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.input_prompt}</p>
                    {task.output_result && (
                      <span className="inline-block text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded mt-1">
                        Sonuç: {task.output_result}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                      isCompleted
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isRunning
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {isCompleted ? "Tamamlandı" : isRunning ? "İşleniyor..." : task.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Agent Wizard Modal */}
      <CreateAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
