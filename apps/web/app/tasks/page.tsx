"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare, Clock, Filter, AlertCircle, CheckCircle2, Play, Ban } from "lucide-react";
import { api, Task } from "@/lib/api";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchTasks = async () => {
    try {
      const res = await api.get<Task[]>("/tasks");
      setTasks(res);
    } catch {
      // Fallback
      setTasks([
        {
          id: "task-1",
          organization_id: "org-1",
          agent_id: "agent-1",
          title: "Q3 Kurumsal Satış Teklif Dosyası Hazırlığı",
          status: "completed",
          priority: "high",
          input_prompt: "Riva ve Stockcamper için Q3 kurumsal filo teklif dokümanını oluştur.",
          output_result: "PDF teklif taslağı ve Excel maliyet tablosu başarıyla oluşturuldu.",
          artifacts: ["Q3_Teklif_Raporu.pdf", "Maliyet.xlsx"],
          created_at: "Bugün 11:20",
          completed_at: "Bugün 11:24"
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
          created_at: "Bugün 12:05"
        },
        {
          id: "task-3",
          organization_id: "org-1",
          agent_id: "agent-3",
          title: "Avrupa Karavan Pazarı Trend Analizi",
          status: "queued",
          priority: "urgent",
          input_prompt: "2026 yılı Avrupa çekme karavan ve motokaravan talep trendlerini raporla.",
          artifacts: [],
          created_at: "Bugün 12:15"
        }
      ]);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((t) => statusFilter === "all" || t.status === statusFilter);

  return (
    <div className="w-full max-w-7xl space-y-6 text-zinc-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Görevler</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              queue
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kuyruk ve sandbox ortamında yürütülen kurumsal görev geçmişi.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-md border border-zinc-800 text-xs">
          {["all", "running", "queued", "completed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors duration-75 ${
                statusFilter === st
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {st === "all" ? "Tümü" : st === "running" ? "Yürütülüyor" : st === "queued" ? "Kuyrukta" : "Tamamlandı"}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800/80 overflow-hidden shadow-subtle">
        {filteredTasks.map((task) => {
          const isDone = task.status === "completed";
          const isRunning = task.status === "running";
          return (
            <div key={task.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-800/30 transition-colors duration-75">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${
                      task.priority === "urgent"
                        ? "bg-rose-950/30 text-rose-400 border-rose-900/50"
                        : task.priority === "high"
                        ? "bg-zinc-800 text-blue-400 border-blue-900/50"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800"
                    }`}
                  >
                    {task.priority}
                  </span>
                  <h3 className="font-medium text-xs text-zinc-200 truncate">{task.title}</h3>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{task.input_prompt}</p>

                {task.output_result && (
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-md text-[11px] text-zinc-300 font-mono">
                    <span className="text-zinc-500 block mb-0.5">Sonuç:</span>
                    {task.output_result}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:items-end gap-1 shrink-0">
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isDone
                        ? "bg-emerald-500"
                        : isRunning
                        ? "bg-blue-500 animate-pulse"
                        : "bg-zinc-600"
                    }`}
                  ></span>
                  <span>{isDone ? "completed" : isRunning ? "running" : "queued"}</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500">{task.created_at}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
