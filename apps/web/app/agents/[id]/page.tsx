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
              ? { ...m, content: "Canlı ajana mesaj gönderebilmek için oturum açmalısınız. Giriş sayfasına yönlendiriliyorsunuz..." }
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
                ? { ...m, content: "Oturum süreniz doldu veya yetkilendirme geçersiz (HTTP 401). Giriş sayfasına yönlendiriliyorsunuz..." }
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
                ? { ...m, content: (m.content ? m.content + "\n\n" : "") + `Hata: ${event.message}` }
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
    <div className="h-[calc(100vh-5.5rem)] flex flex-col md:flex-row gap-4 w-full max-w-7xl text-zinc-300">
      {/* ---------------- LEFT PANEL: Agent Info & Model Switcher ---------------- */}
      <div className="w-full md:w-72 bg-zinc-900 rounded-lg border border-zinc-800 p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
            <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200 font-mono text-xs font-semibold shrink-0">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="font-medium text-zinc-100 text-sm truncate">{agent.name}</h2>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/50 mt-0.5 inline-block">
                {agent.role}
              </span>
            </div>
          </div>

          {/* Model Switcher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Aktif Çıkarım Modeli
            </label>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              <optgroup label="OpenAI">
                <option value="openai/gpt-6-astra-pro">GPT-6 Astra Pro · 1M Context</option>
                <option value="openai/gpt-6-astra">GPT-6 Astra · Flagship</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini · Fast</option>
              </optgroup>
              <optgroup label="Anthropic">
                <option value="anthropic/claude-fable-5.1">Claude Fable 5.1 · Mythos Tier</option>
                <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet · Hybrid</option>
                <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku · Fast</option>
              </optgroup>
              <optgroup label="Google">
                <option value="google/gemini-3.1-pro">Gemini 3.1 Pro · 1M Context</option>
                <option value="google/gemini-3.8-flash">Gemini 3.8 Flash · Fast</option>
                <option value="google/gemini-3.7-flash">Gemini 3.7 Flash · Hybrid</option>
                <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
              </optgroup>
              <optgroup label="DeepSeek">
                <option value="deepseek/deepseek-v4-pro">DeepSeek V4 Pro · MoE</option>
                <option value="deepseek/deepseek-v4.1-flash">DeepSeek V4.1 Flash · CED</option>
                <option value="deepseek/deepseek-v4-flash">DeepSeek V4 Flash</option>
              </optgroup>
              <optgroup label="Community / Open">
                <option value="openrouter/free">OpenRouter Free Router</option>
                <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Instruct</option>
              </optgroup>
            </select>
            <span className="text-[10px] text-zinc-500 font-mono block">
              Model değişiminde oturum hafızası korunur.
            </span>
          </div>

          {/* Sandbox & Permissions */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Sandbox Araçları
            </span>
            <div className="space-y-1">
              {agent.tool_permissions?.allowed_tools?.map((tool) => (
                <div
                  key={tool}
                  className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-950/60 border border-zinc-800/80 text-[11px] font-mono text-zinc-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="truncate">{tool}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Instructions Preview */}
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Sistem Talimatları
            </span>
            <p className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded border border-zinc-800/80 leading-relaxed font-mono line-clamp-4">
              {agent.system_instructions}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>Durum:</span>
          <span className="text-zinc-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> aktif
          </span>
        </div>
      </div>

      {/* ---------------- CENTER PANEL: Live Interactive Conversation ---------------- */}
      <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-800 shadow-subtle flex flex-col justify-between overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div>
            <h3 className="font-medium text-xs text-zinc-100">Ajan Workspace</h3>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>{selectedModel}</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">RLS Sandbox</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
          {!isLoggedIn && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-md flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Ajanla canlı mesajlaşmak ve araçları çalıştırmak için oturum açmalısınız.</span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium shrink-0 transition-colors duration-75 flex items-center gap-1 cursor-pointer"
              >
                <span>Giriş Yap</span>
              </button>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] font-semibold flex items-center justify-center shrink-0 border border-zinc-700/60 mt-0.5">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-md px-3.5 py-2.5 text-xs leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-950 border border-zinc-800 text-zinc-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span
                    className={`text-[9px] font-mono mt-1.5 block ${
                      isUser ? "text-blue-200 text-right" : "text-zinc-500"
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
            <div className="flex items-center gap-2.5 p-2.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">İşlem:</span>
                <span className="text-zinc-200 truncate">{currentToolActivity}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/40">
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
              placeholder={`${agent.name} için bir komut veya soru yazın...`}
              disabled={isStreaming}
              className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors duration-75"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors duration-75 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Gönder</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
