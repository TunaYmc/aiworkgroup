"use client";

import React, { useState } from "react";
import { X, Check, ArrowRight, ArrowLeft, Bot, Sparkles, Cpu, Wrench, Shield, FileText } from "lucide-react";
import { api } from "@/lib/api";

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES = [
  { id: "Sales Employee", title: "Satış & Müşteri Geliştirme", desc: "Müşteri teklifleri, CRM güncellemeleri ve satış analizleri hazırlar." },
  { id: "Accounting Employee", title: "Muhasebe & Finans", desc: "Fatura eşleme, gider takibi, vergi ve gelir tablolarını analiz eder." },
  { id: "HR Employee", title: "İnsan Kaynakları", desc: "Aday CV tarama, bordro soruları ve şirket içi politika rehberliği." },
  { id: "Project Management", title: "Proje Yönetimi", desc: "Sprint takibi, görev atamaları ve durum raporlaması yapar." },
  { id: "Research Employee", title: "Piyasa & Teknik Araştırma", desc: "Rakip analizi, web taraması ve derin teknik raporlama üretir." },
  { id: "Operations Employee", title: "Operasyon & Destek", desc: "Envanter takibi, tedarikçi yazışmaları ve bilet yönetimi." },
];

const AVAILABLE_TOOLS = [
  { id: "file_search", name: "Döküman Arama (RAG)", desc: "Şirket içi pdf, excel ve metin dökümanlarında anlamsal arama yapar." },
  { id: "file_read", name: "Dosya Okuma", desc: "Belirtilen dosya içeriklerini okur ve analiz eder." },
  { id: "file_write", name: "Dosya Oluşturma", desc: "Rapor, hesap tablosu veya yeni dosyalar üretir." },
  { id: "python", name: "Python Kod Çalıştırma", desc: "İzole sandbox içinde veri işleme ve hesaplama kodları çalıştırır." },
  { id: "web_search", name: "Web Araması", desc: "Canlı internet araması ve güncel pazar verilerini çeker." },
  { id: "browser", name: "Tarayıcı Otomasyonu", desc: "Playwright ile web sitelerinde form doldurma ve gezinti yapar." },
];

export default function CreateAgentModal({ isOpen, onClose, onSuccess }: CreateAgentModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState("Sales Employee");
  const [instructions, setInstructions] = useState(
    "Sen şirketimizin kıdemli AI çalışanısın. Verilen kurumsal görevleri profesyonelce, titiz ve eksiksiz bir şekilde tamamla."
  );
  const [selectedTools, setSelectedTools] = useState<string[]>([
    "file_search",
    "file_read",
    "file_write",
    "python",
    "web_search"
  ]);
  const [model, setModel] = useState("anthropic/claude-3.7-sonnet");

  if (!isOpen) return null;

  const toggleTool = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((t) => t !== toolId));
    } else {
      setSelectedTools([...selectedTools, toolId]);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api.post("/agents", {
        name,
        role,
        system_instructions: instructions,
        model_config_data: {
          primary_model: model,
          fallback_models: ["openai/gpt-4o-mini"],
          temperature: 0.3,
          max_tokens: 4096
        },
        tool_permissions: {
          allowed_tools: selectedTools,
          denied_tools: ["arbitrary_host_exec"]
        }
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 shadow-card w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center justify-center font-mono text-xs">
              YZ
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Yeni Ajan Servisi Oluştur</h2>
              <p className="text-[11px] font-mono text-zinc-500">Adım {step} / 5</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors duration-75">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-zinc-800 h-0.5">
          <div
            className="bg-blue-600 h-0.5 transition-all duration-100"
            style={{ width: `${(step / 5) * 100}%` }}
          ></div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: Name & Role */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  Ajan Servis Adı
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Satış Servisi, Finans Denetçisi"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                  Uzmanlık Rolü
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={`p-2.5 rounded-md border text-left cursor-pointer transition-colors duration-75 ${
                        role === r.id
                          ? "border-blue-500 bg-blue-950/20 text-zinc-100"
                          : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/40"
                      }`}
                    >
                      <span className="font-medium text-xs text-zinc-200 block">{r.title}</span>
                      <span className="text-[11px] text-zinc-500 mt-0.5 block leading-normal">{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Instructions */}
          {step === 2 && (
            <div className="space-y-2.5">
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Sistem Talimatları ve Çalışma Prensipleri
              </label>
              <p className="text-xs text-zinc-500">
                Ajanın şirket kurallarına ve hedeflerine nasıl uyacağını belirleyin.
              </p>
              <textarea
                rows={7}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
              />
            </div>
          )}

          {/* STEP 3: Tools */}
          {step === 3 && (
            <div className="space-y-2.5">
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Yetkili Araçlar & Sandbox İzinleri
              </label>
              <p className="text-xs text-zinc-500 mb-2">
                Ajanın izole Docker sandbox ortamında çalıştırabileceği araçları seçin.
              </p>
              <div className="space-y-1.5">
                {AVAILABLE_TOOLS.map((tool) => {
                  const isChecked = selectedTools.includes(tool.id);
                  return (
                    <div
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={`p-2.5 rounded-md border flex items-center justify-between cursor-pointer transition-colors duration-75 ${
                        isChecked ? "border-blue-500/80 bg-blue-950/20" : "border-zinc-800 bg-zinc-950/40"
                      }`}
                    >
                      <div>
                        <span className="font-medium text-xs text-zinc-200 block">{tool.name}</span>
                        <span className="text-[11px] text-zinc-500">{tool.desc}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                          isChecked ? "bg-blue-600 text-white" : "border border-zinc-700"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Model */}
          {step === 4 && (
            <div className="space-y-2.5">
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Birincil Çıkarım Modeli (OpenRouter)
              </label>
              <div className="space-y-1.5">
                {[
                  { id: "openai/gpt-6-astra-pro", name: "GPT-6 Astra Pro", provider: "OpenAI", tag: "Pro Reasoning", desc: "1M bağlam, Astra mimarili otonom analiz." },
                  { id: "openai/gpt-6-astra", name: "GPT-6 Astra", provider: "OpenAI", tag: "Flagship", desc: "1M bağlam, uçtan uca kurumsal veri sentezi." },
                  { id: "anthropic/claude-fable-5.1", name: "Claude Fable 5.1", provider: "Anthropic", tag: "Mythos Tier", desc: "Derin yazılım mimarisi ve uzun ajan akışları." },
                  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic", tag: "Hybrid", desc: "Gelişmiş hibrit akıl yürütme ve problem çözme." },
                  { id: "google/gemini-3.1-pro", name: "Gemini 3.1 Pro", provider: "Google", tag: "1M Context", desc: "1M bağlam, derin muhakeme ve veri analizi." },
                  { id: "google/gemini-3.8-flash", name: "Gemini 3.8 Flash", provider: "Google", tag: "Fast", desc: "1M bağlam, ultra hızlı ve dengeli çıkarım." },
                  { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro", provider: "DeepSeek", tag: "MoE", desc: "Geniş ölçekli MoE akıl yürütme motoru." },
                  { id: "deepseek/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", provider: "DeepSeek", tag: "CED Agentic", desc: "Ajan odaklı hızlı karar alma mimarisi." },
                  { id: "openrouter/free", name: "OpenRouter Free Router", provider: "OpenRouter", tag: "Free", desc: "Otomatik en uygun ücretsiz model rotası." },
                  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B Instruct", provider: "Meta", tag: "Free", desc: "Açık ağırlıklı, ücretsiz kota modeli." }
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`p-2.5 rounded-md border flex items-center justify-between cursor-pointer transition-colors duration-75 ${
                      model === m.id ? "border-blue-500 bg-blue-950/20" : "border-zinc-800 bg-zinc-950/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-zinc-100">{m.name}</span>
                        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700/50 leading-none">
                          {m.provider}
                        </span>
                        {m.tag && (
                          <span className="text-[10px] font-mono bg-zinc-800/80 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 leading-none">
                            {m.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{m.desc}</p>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        model === m.id ? "border-blue-500 bg-blue-600" : "border-zinc-700"
                      }`}
                    >
                      {model === m.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Review */}
          {step === 5 && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-md bg-zinc-950 border border-zinc-800 space-y-2.5">
                <h3 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                  Özet İnceleme
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block font-mono text-[11px]">Ajan Adı:</span>
                    <span className="font-medium text-zinc-200">{name || "İsimsiz"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block font-mono text-[11px]">Rolü:</span>
                    <span className="font-medium text-blue-400">{role}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block font-mono text-[11px]">Model:</span>
                    <span className="font-mono text-zinc-300 text-[11px]">{model}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block font-mono text-[11px]">Yetkili Araçlar:</span>
                    <span className="font-mono text-zinc-300 text-[11px]">{selectedTools.length} Araç</span>
                  </div>
                </div>
              </div>
              <div className="p-2.5 bg-zinc-900 rounded-md border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>İzole Docker sandbox ortamı otomatik olarak tahsis edilecektir.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between bg-zinc-900">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-3 py-1.5 border border-zinc-800 rounded-md text-xs font-medium text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5 transition-colors duration-75"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Geri</span>
            </button>
          ) : (
            <div></div>
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !name.trim()}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors duration-75"
            >
              <span>İleri</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors duration-75"
            >
              {loading ? "Oluşturuluyor..." : "Ajan Servisini Başlat"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
