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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Görev Havuzu</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 tracking-wider">
              MOCK / TASLAK
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Arka plan kuyruğu (Celery) ve izole sandbox ortamında yürütülen kurumsal görevler
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 text-xs">
          {["all", "running", "queued", "completed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition ${
                statusFilter === st
                  ? "bg-sky-50 text-sky-700 border border-sky-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st === "all" ? "Tümü" : st === "running" ? "Yürütülüyor" : st === "queued" ? "Kuyrukta" : "Tamamlandı"}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredTasks.map((task) => {
          const isDone = task.status === "completed";
          const isRunning = task.status === "running";
          return (
            <div key={task.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                      task.priority === "urgent"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : task.priority === "high"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {task.priority}
                  </span>
                  <h3 className="font-bold text-base text-slate-900">{task.title}</h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{task.input_prompt}</p>

                {task.output_result && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono">
                    <span className="font-bold text-sky-800 block mb-1">Çıktı & Sonuç:</span>
                    {task.output_result}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border inline-flex items-center gap-1.5 ${
                    isDone
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isRunning
                      ? "bg-sky-50 text-sky-700 border-sky-200 animate-pulse"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>{isDone ? "Tamamlandı" : isRunning ? "Yürütülüyor..." : "Kuyrukta"}</span>
                </span>
                <span className="text-[11px] text-slate-400">{task.created_at}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
