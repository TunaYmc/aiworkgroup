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
          id: "google/gemini-3.1-pro",
          name: "Gemini 3.1 Pro (Yüksek Tier)",
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
          name: "Gemini 3.8 Flash (Orta Tier)",
          provider: "Google",
          context_length: 1000000,
          prompt_price_per_1m: 0.35,
          completion_price_per_1m: 1.05,
          description: "Yüksek hızlı, çok modlu ve dengeli yeni nesil kurumsal yapay zeka personeli.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "google/gemini-2.0-flash-001",
          name: "Gemini 2.0 Flash (Düşük / Hızlı)",
          provider: "Google",
          context_length: 1000000,
          prompt_price_per_1m: 0.10,
          completion_price_per_1m: 0.40,
          description: "1 Milyon token bağlam penceresi, ultra düşük gecikme ve yüksek ekonomik verim.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "anthropic/claude-3.7-sonnet",
          name: "Claude 3.7 Sonnet (Yüksek Tier)",
          provider: "Anthropic",
          context_length: 200000,
          prompt_price_per_1m: 3.0,
          completion_price_per_1m: 15.0,
          description: "En üst düzey hibrit mantık yürütme, kod yazma ve derin problem çözme modeli.",
          supports_tools: true,
          is_default: true,
        },
        {
          id: "anthropic/claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet (Orta Tier)",
          provider: "Anthropic",
          context_length: 200000,
          prompt_price_per_1m: 3.0,
          completion_price_per_1m: 15.0,
          description: "Gelişmiş kurumsal görev yürütme, döküman sentezi ve mükemmel Türkçe kabiliyeti.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "openai/o3-mini",
          name: "OpenAI o3-mini (Yüksek Tier)",
          provider: "OpenAI",
          context_length: 200000,
          prompt_price_per_1m: 1.10,
          completion_price_per_1m: 4.40,
          description: "Karmaşık mantık, matematik, kodlama ve adım adım analitik düşünme modeli.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "openai/gpt-4o",
          name: "GPT-4o Omnimodel (Orta Tier)",
          provider: "OpenAI",
          context_length: 128000,
          prompt_price_per_1m: 2.5,
          completion_price_per_1m: 10.0,
          description: "Çok modlu ve genel amaçlı hızlı kurumsal yapay zeka personeli.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "deepseek/deepseek-r1",
          name: "DeepSeek R1 (Yüksek Tier)",
          provider: "DeepSeek",
          context_length: 64000,
          prompt_price_per_1m: 0.55,
          completion_price_per_1m: 2.19,
          description: "Açık mantık ağı; matematik, algoritma ve karmaşık muhasebe denetimi için akıl yürütme.",
          supports_tools: true,
          is_default: false,
        },
        {
          id: "deepseek/deepseek-chat",
          name: "DeepSeek V3 (Orta Tier)",
          provider: "DeepSeek",
          context_length: 64000,
          prompt_price_per_1m: 0.14,
          completion_price_per_1m: 0.28,
          description: "Son derece hızlı ve güçlü genel amaçlı çok dilli dil modeli.",
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
