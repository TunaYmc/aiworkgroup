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
    <div className="w-full max-w-7xl space-y-6 text-zinc-300">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800 space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
            Modeller
          </h1>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            catalog
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          OpenRouter geçidi üzerinden sunulan çıkarım modelleri ve maliyet oranları.
        </p>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {models.map((model) => (
          <div
            key={model.id}
            className="bg-zinc-900 rounded-lg border border-zinc-800 p-5 shadow-subtle flex flex-col justify-between hover:border-zinc-700 transition-colors duration-75"
          >
            <div>
              {/* Card Title & Provider */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-xs text-zinc-100 truncate">{model.name}</h3>
                    {model.is_default && (
                      <span className="text-[10px] font-mono bg-blue-950/40 text-blue-400 border border-blue-800/40 px-1.5 py-0.5 rounded">
                        default
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block truncate">{model.id}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700/60 shrink-0">
                  {model.provider}
                </span>
              </div>

              {/* Description with fixed baseline alignment */}
              <p className="text-xs text-zinc-400 leading-relaxed mt-2.5 line-clamp-2 min-h-[36px]">
                {model.description}
              </p>

              {/* Specs Grid: Left, Center, Right aligned */}
              <div className="grid grid-cols-3 gap-2 py-2.5 my-3 border-y border-zinc-800/80 text-[11px] font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Bağlam:</span>
                  <span className="text-zinc-200 font-medium">
                    {(model.context_length / 1000).toFixed(0)}k token
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-zinc-500 block text-[10px]">Giriş (1M):</span>
                  <span className="text-zinc-200 font-medium">
                    ${model.prompt_price_per_1m.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 block text-[10px]">Çıkış (1M):</span>
                  <span className="text-zinc-200 font-medium">
                    ${model.completion_price_per_1m.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Tool Calling & Streaming</span>
              </span>
              <span className="text-zinc-500 text-[10px]">
                {model.supports_tools ? "Full Support" : "Inference Only"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
