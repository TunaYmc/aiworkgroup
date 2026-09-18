"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Bot,
  Send,
  Cpu,
  Wrench,
  Shield,
  Clock,
  Sparkles,
  FileText,
  Terminal,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  FolderOpen,
  LogIn
} from "lucide-react";
import { api, Agent, getApiUrl } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolEvent?: {
    tool: string;
    status: string;
    result?: string;
  };
}

export default function AgentWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params?.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolActivity, setCurrentToolActivity] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("anthropic/claude-3.7-sonnet");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    // Fetch Agent details
    api.get<Agent>(`/agents/${agentId}`).then((data) => {
      setAgent(data);
      if (data.model_config_data?.primary_model) {
        setSelectedModel(data.model_config_data.primary_model);
      }
    }).catch(() => {
      // Fallback
      setAgent({
        id: agentId,
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
      });
    });

    // Initial greeting
    setMessages([
      {
        id: "msg-1",
        role: "assistant",
        content: `Merhaba! Ben Selin. Şirket veritabanı, fiyat listeleri ve kurumsal dökümanlar üzerinde çalışmaya hazırım. Size bugün nasıl yardımcı olabilirim?`,
        timestamp: "12:00",
      },
    ]);
  }, [agentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentToolActivity]);

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userPrompt = input.trim();
    setInput("");

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsStreaming(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") : null;

      if (!token) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: "⚠️ Canlı ajana mesaj gönderebilmek için oturum açmalısınız. Giriş sayfasına yönlendiriliyorsunuz..." }
              : m
          )
        );
        setTimeout(() => {
          router.push("/login");
        }, 1200);
        return;
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (orgId) headers["X-Organization-ID"] = orgId;

      const res = await fetch(`${getApiUrl()}/agents/${agentId}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: userPrompt, model: selectedModel }),
      });

      if (!res.ok || !res.body) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("currentOrgId");
          setIsLoggedIn(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: "⚠️ Oturum süreniz doldu veya yetkilendirme geçersiz (HTTP 401). Giriş sayfasına yönlendiriliyorsunuz..." }
                : m
            )
          );
          setTimeout(() => {
            router.push("/login");
          }, 1500);
          return;
        }
        throw new Error(`Chat isteği başarısız: HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let receivedAnyText = false;

      const processEvent = (event: any) => {
        if (!event) return;
        if (event.type === "thought") {
          setCurrentToolActivity(event.content);
        } else if (event.type === "tool_call") {
          setCurrentToolActivity(`Araç çalıştırılıyor: ${event.tool}...`);
        } else if (event.type === "tool_result") {
          setCurrentToolActivity(`Araç tamamlandı: ${event.tool}`);
        } else if (event.type === "permission_denied") {
          setCurrentToolActivity(`Güvenlik Engeli: ${event.message}`);
        } else if (event.type === "assistant_text") {
          if (event.content) {
            receivedAnyText = true;
            setCurrentToolActivity(null);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: m.content + event.content } : m
              )
            );
          }
        } else if (event.type === "error") {
          receivedAnyText = true;
          setCurrentToolActivity(null);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: (m.content ? m.content + "\n\n" : "") + `⚠️ ${event.message}` }
                : m
            )
          );
        } else if (event.type === "done") {
          setCurrentToolActivity(null);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Normalize CRLF to LF
        buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
              const rawData = trimmed.replace(/^data:\s*/, "");
              if (rawData) {
                try {
                  const event = JSON.parse(rawData);
                  processEvent(event);
                } catch (e) {
                  // skip non-json
                }
              }
            }
          }
        }
      }

      // Process any remaining text in buffer after stream finishes
      if (buffer.trim()) {
        const lines = buffer.trim().split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const rawData = trimmed.replace(/^data:\s*/, "");
            if (rawData) {
              try {
                const event = JSON.parse(rawData);
                processEvent(event);
              } catch (e) {}
            }
          }
        }
      }

      // Safeguard: ensure balloon is never empty
      if (!receivedAnyText) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId && !m.content
              ? { ...m, content: "İşlem tamamlandı. Talebiniz başarıyla işlendi." }
              : m
          )
        );
      }
    } catch (err: any) {
      console.error("Chat streaming error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: m.content || `Bağlantı hatası: ${err.message}` }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      setCurrentToolActivity(null);
    }
  };


  const handleModelChange = async (newModel: string) => {
    setSelectedModel(newModel);
    try {
      await api.patch(`/models/agent/${agentId}`, {
        primary_model: newModel,
      });
    } catch {
      // Local state is already updated
    }
  };

  if (!agent) {
    return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6 max-w-[1600px] mx-auto">
      {/* ---------------- LEFT PANEL: Agent Info & Model Switcher ---------------- */}
      <div className="w-full md:w-80 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs shrink-0 overflow-y-auto">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-100 flex items-center justify-center text-sky-700 font-bold border border-sky-200">
              <Bot className="w-6 h-6 text-sky-700" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm leading-snug">{agent.name}</h2>
              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 mt-1 inline-block">
                {agent.role}
              </span>
            </div>
          </div>

          {/* Model Switcher (Section 10 & 43) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Aktif Çıkarım Modeli (LLM)
            </label>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="openrouter/free">🟢 OpenRouter Free Router (Otomatik Ücretsiz)</option>
              <option value="meta-llama/llama-3.3-70b-instruct:free">🟢 Llama 3.3 70B (Ücretsiz / Free)</option>
              <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet (Anthropic)</option>
              <option value="openai/gpt-4o">GPT-4o (OpenAI)</option>
              <option value="openai/gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
              <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash (Google)</option>
              <option value="deepseek/deepseek-r1">DeepSeek R1 (DeepSeek)</option>
            </select>
            <span className="text-[10px] text-slate-400 block">
              Model değiştiğinde sohbet geçmişi ve agent hafızası korunur.
            </span>
          </div>

          {/* Sandbox & Permissions */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Sandbox Araç İzinleri
            </span>
            <div className="space-y-1.5">
              {agent.tool_permissions?.allowed_tools?.map((tool) => (
                <div
                  key={tool}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  <span className="font-mono text-[11px]">{tool}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Instructions Preview */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Rol Talimatları
            </span>
            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed font-mono line-clamp-4">
              {agent.system_instructions}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Durum:</span>
          <span className="font-semibold text-emerald-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Çevrimiçi
          </span>
        </div>
      </div>

      {/* ---------------- CENTER PANEL: Live Interactive Conversation ---------------- */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-sm text-slate-900">Çalışma Sohbeti & Canlı Görev</h3>
          </div>
          <div className="text-xs text-slate-400">Tenant İzolasyonu Devrede</div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {!isLoggedIn && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Ajanla canlı mesajlaşmak ve araçları çalıştırmak için oturum açmalısınız.</span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Giriş Yap</span>
              </button>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs shrink-0 border border-sky-200">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? "bg-sky-600 text-white rounded-tr-xs"
                      : "bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span
                    className={`text-[10px] mt-1.5 block ${
                      isUser ? "text-sky-200 text-right" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Live Activity Event (Thinking & Tool Streaming) */}
          {currentToolActivity && (
            <div className="flex items-center gap-3 p-3 bg-sky-50/80 border border-sky-200 rounded-xl text-xs text-sky-800 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold">AI Çalışan İşlem Yapıyor</span>
                <span className="text-[11px] text-sky-600">{currentToolActivity}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`${agent.name} için bir görev veya soru yazın...`}
              disabled={isStreaming}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-5 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm shadow-sky-500/20 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Görev Ver</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
