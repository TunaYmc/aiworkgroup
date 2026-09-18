"use client";

import React, { useState, useEffect } from "react";
import { Cpu, Check, Sparkles, Zap, Shield, HelpCircle } from "lucide-react";
import { api, ModelItem } from "@/lib/api";

export default function ModelsPage() {
  const [models, setModels] = useState<ModelItem[]>([]);

  useEffect(() => {
    api.get<ModelItem[]>("/models/catalog").then((res) => {
      setModels(res);
    }).catch(() => {
      setModels([
        {
          id: "openai/gpt-6-astra-pro",
          name: "GPT-6 Astra Pro (Yüksek / Pro Reasoning)",
          provider: "OpenAI",
          context_length: 1000000,
          prompt_price_per_1m: 2.50,
          completion_price_per_1m: 10.00,
          description: "OpenAI'ın en üst düzey Astra akıl yürütme modeli; karmaşık projeler ve çok adımlı otonom işler (1M Context).",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "openai/gpt-6-astra",
          name: "GPT-6 Astra (Orta / Flagship General)",
          provider: "OpenAI",
          context_length: 1000000,
          prompt_price_per_1m: 1.25,
          completion_price_per_1m: 5.00,
          description: "Uçtan uca kurumsal operasyonlar, veri sentezi ve genel şirket işleri için amiral gemisi model.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "anthropic/claude-fable-5.1",
          name: "Claude Fable 5.1 (Yüksek / Mythos Tier)",
          provider: "Anthropic",
          context_length: 500000,
          prompt_price_per_1m: 3.0,
          completion_price_per_1m: 15.0,
          description: "Mythos sınıfı otonom bilgi işleme, derin yazılım mimarisi ve uzun süreli ajan iş akışları.",
          supports_tools: true,
          is_default: true,
        },
        {
          id: "anthropic/claude-3.7-sonnet",
          name: "Claude 3.7 Sonnet (Orta / Hybrid Reasoning)",
          provider: "Anthropic",
          context_length: 200000,
          prompt_price_per_1m: 3.0,
          completion_price_per_1m: 15.0,
          description: "Gelişmiş hibrit mantık yürütme, analitik problem çözme ve kurumsal yazılım zekası.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "google/gemini-3.1-pro",
          name: "Gemini 3.1 Pro (Yüksek / 1M Context)",
          provider: "Google",
          context_length: 1000000,
          prompt_price_per_1m: 1.25,
          completion_price_per_1m: 5.0,
          description: "Google'ın en gelişmiş derin akıl yürütme, problem çözme ve büyük veri analiz modeli.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "google/gemini-3.8-flash",
          name: "Gemini 3.8 Flash (Orta / 1M Context)",
          provider: "Google",
          context_length: 1000000,
          prompt_price_per_1m: 0.35,
          completion_price_per_1m: 1.05,
          description: "Yüksek hızlı, çok modlu ve dengeli yeni nesil kurumsal yapay zeka personeli.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "deepseek/deepseek-v4-pro",
          name: "DeepSeek V4 Pro (Yüksek / MoE Reasoning)",
          provider: "DeepSeek",
          context_length: 128000,
          prompt_price_per_1m: 0.60,
          completion_price_per_1m: 2.40,
          description: "Geniş ölçekli Uzman Karışımı (MoE), açık mantık ağı ve karmaşık algoritmik denetim.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "deepseek/deepseek-v4.1-flash",
          name: "DeepSeek V4.1 Flash (Orta / CED Agentic)",
          provider: "DeepSeek",
          context_length: 128000,
          prompt_price_per_1m: 0.20,
          completion_price_per_1m: 0.60,
          description: "Causal Encoder-Decoder (CED) mimarili, son derece hızlı ve ajan iş akışları için optimize.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "openrouter/free",
          name: "OpenRouter Free Router",
          provider: "OpenRouter",
          context_length: 128000,
          prompt_price_per_1m: 0.0,
          completion_price_per_1m: 0.0,
          description: "Herhangi bir bakiye gerektirmeyen otomatik en uygun ücretsiz model.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "meta-llama/llama-3.3-70b-instruct:free",
          name: "Llama 3.3 70B Instruct (Ücretsiz)",
          provider: "Meta",
          context_length: 128000,
          prompt_price_per_1m: 0.0,
          completion_price_per_1m: 0.0,
          description: "Gelişmiş açık kaynaklı büyük dil modeli (OpenRouter ücretsiz kotası).",
          supports_tools: true,
          is_default: false,
        }
      ]);
    });
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Model Kataloğu & LLM Geçidi (OpenRouter)
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tüm AI personelleriniz için dinamik olarak değiştirilebilir inference modelleri ve maliyet oranları
        </p>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {models.map((model) => (
          <div
            key={model.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{model.name}</h3>
                    {model.is_default && (
                      <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-md font-bold">
                        Varsayılan
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-mono mt-0.5 block">{model.id}</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                  {model.provider}
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">{model.description}</p>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Bağlam Penceresi</span>
                  <span className="font-bold text-slate-800">
                    {(model.context_length / 1000).toFixed(0)}k token
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Giriş (1M Token)</span>
                  <span className="font-bold text-slate-800">${model.prompt_price_per_1m}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Çıkış (1M Token)</span>
                  <span className="font-bold text-slate-800">${model.completion_price_per_1m}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <Check className="w-4 h-4" /> Tool Calling & Streaming Destekli
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
