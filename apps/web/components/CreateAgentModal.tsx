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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Yeni AI Çalışan Oluştur</h2>
              <p className="text-xs text-slate-400">Adım {step} / 5</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-sky-500 h-1 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          ></div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: Name & Role */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  AI Çalışanın Adı
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Ayşe - Satış Uzmanı, Mert - Finans Analisti"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Uzmanlık Rolü
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLES.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        role === r.id
                          ? "border-sky-500 bg-sky-50/50 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="font-semibold text-xs text-slate-900 block">{r.title}</span>
                      <span className="text-[11px] text-slate-500 mt-1 block leading-relaxed">{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Instructions */}
          {step === 2 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sistem Talimatları ve Çalışma Prensipleri
              </label>
              <p className="text-xs text-slate-500">
                AI çalışanınızın şirket kurallarına, tonuna ve hedeflerine nasıl uyacağını belirleyin.
              </p>
              <textarea
                rows={7}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono"
              />
            </div>
          )}

          {/* STEP 3: Tools */}
          {step === 3 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Yetkili Araçlar & Sandbox İzinleri
              </label>
              <p className="text-xs text-slate-500 mb-2">
                AI çalışanın güvenli Docker sandbox içinde hangi operasyonları yapabileceğini seçin.
              </p>
              <div className="space-y-2">
                {AVAILABLE_TOOLS.map((tool) => {
                  const isChecked = selectedTools.includes(tool.id);
                  return (
                    <div
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isChecked ? "border-sky-400 bg-sky-50/40" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-xs text-slate-900 block">{tool.name}</span>
                        <span className="text-[11px] text-slate-500">{tool.desc}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                          isChecked ? "bg-sky-500 text-white" : "border border-slate-300"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Model */}
          {step === 4 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Birincil Çıkarım Modeli (OpenRouter)
              </label>
              <div className="space-y-2.5">
                {[
                  { id: "openrouter/free", name: "OpenRouter Free Router", provider: "OpenRouter", tag: "Ücretsiz", desc: "Bakiye gerektirmeyen, OpenRouter üzerindeki en uygun ücretsiz model." },
                  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B Instruct", provider: "Meta", tag: "Ücretsiz", desc: "Açık kaynaklı, ücretsiz kota ile kullanılabilen güçlü model." },
                  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic", tag: "Tavsiye Edilen", desc: "En yüksek akıl yürütme, Türkçe kabiliyeti ve araç kullanımı." },
                  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", tag: "Çok Modlu", desc: "Hızlı yanıt ve genel şirket operasyonları." },
                  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", provider: "Google", tag: "Ekonomik", desc: "1M bağlam ve düşük gecikmeli görevler." },
                  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", tag: "Derin Mantık", desc: "Açık kaynak matematiksel ve analitik akıl yürütme." }
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      model === m.id ? "border-sky-500 bg-sky-50/40 shadow-xs" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{m.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {m.provider}
                        </span>
                        {m.tag && (
                          <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-semibold">
                            {m.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{m.desc}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        model === m.id ? "border-sky-500 bg-sky-500" : "border-slate-300"
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
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Özet İnceleme
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Çalışan Adı:</span>
                    <span className="font-bold text-slate-900">{name || "İsimsiz Çalışan"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Rolü:</span>
                    <span className="font-bold text-sky-700">{role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Model:</span>
                    <span className="font-mono text-slate-700">{model}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Yetkili Araç Sayısı:</span>
                    <span className="font-bold text-slate-700">{selectedTools.length} Araç</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bu agent için izole Docker sandbox çalışma alanı otomatik ayrılacaktır.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition"
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
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-sky-500/20"
            >
              <span>İleri</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition shadow-sm shadow-sky-500/20"
            >
              {loading ? "Oluşturuluyor..." : "AI Çalışanı Başlat"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
