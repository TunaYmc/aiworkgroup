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
import { SkeletonStatCard, SkeletonCard, SkeletonRow } from "@/components/Skeleton";
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
    <div className="w-full max-w-7xl space-y-6 text-zinc-300">
      {/* Auth Warning for Visitors */}
      {!isLoggedIn && (
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-300 shadow-subtle">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
            <div className="text-xs">
              <span className="font-medium text-zinc-100 mr-2">Oturum Açın</span>
              <span className="text-zinc-400">Canlı ajan etkileşimi, görev başlatma ve döküman yönetimi için giriş yapmalısınız.</span>
            </div>
          </div>
          <Link
            href="/login"
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 hover-glow text-white rounded-md text-xs font-medium transition-colors duration-75 shrink-0"
          >
            Giriş Yap →
          </Link>
        </div>
      )}

      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Workspace Overview
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              overview
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Yönetilen ajan servisleri, arka plan görevleri ve döküman çalışma alanları.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 hover-glow text-white rounded-md text-xs font-medium transition-colors duration-75 shadow-subtle cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Ajan Servisi</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          [
            {
              label: "Aktif Ajanlar",
              value: agents.length.toString(),
              detail: "Çalışma alanları hazır",
            },
            {
              label: "Yürütülen Görevler",
              value: tasks.filter(t => t.status === "running").length.toString(),
              detail: "Sandbox kuyruğu aktif",
            },
            {
              label: "İşlenen Dökümanlar",
              value: "148",
              detail: "Döküman havuzunda",
            },
            {
              label: "Aylık Tüketim",
              value: "2.4M",
              detail: "$7.20 / $30.00 bütçe",
            },
          ].map((metric, i) => (
            <div
              key={i}
              className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 shadow-subtle flex flex-col justify-between hover-lift"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">{metric.label}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-semibold text-zinc-100 font-mono tracking-tight">{metric.value}</span>
                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{metric.detail}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Agents Grid Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100">Ajan Servisleri</h2>
            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60 px-1.5 py-0.5 rounded leading-none">
              {loading ? "..." : `${agents.length} Servis`}
            </span>
          </div>
          <Link
            href="/agents"
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors duration-75"
          >
            <span>Tümünü Gör</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Tasks & Execution Feed */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5 shadow-subtle space-y-3.5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Son Yürütülen Görevler</h2>
            <p className="text-[11px] text-zinc-500">Sandbox ve kuyruk geçmişi</p>
          </div>
          <Link
            href="/tasks"
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors duration-75"
          >
            <span>Görev Havuzuna Git</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : (
            tasks.map((task) => {
              const isCompleted = task.status === "completed";
              const isRunning = task.status === "running";
              return (
                <div key={task.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-1.5 shrink-0">
                      <span
                        className={`block w-1.5 h-1.5 rounded-full ${
                          isCompleted
                            ? "bg-emerald-500"
                            : isRunning
                            ? "bg-blue-500 animate-pulse"
                            : "bg-zinc-600"
                        }`}
                      ></span>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-zinc-200">{task.title}</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{task.input_prompt}</p>
                      {task.output_result && (
                        <span className="inline-block text-[10px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded mt-1">
                          Sonuç: {task.output_result}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isCompleted
                          ? "bg-zinc-950 text-emerald-400 border-emerald-950/40"
                          : isRunning
                          ? "bg-zinc-950 text-blue-400 border-blue-950/40"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800"
                      }`}
                    >
                      {isCompleted ? "Tamamlandı" : isRunning ? "İşleniyor" : task.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
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
