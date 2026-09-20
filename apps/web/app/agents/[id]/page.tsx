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
  ChevronDown,
  ChevronUp,
  Settings,
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
  thoughtDuration?: number;
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
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSandboxToolsOpen, setIsSandboxToolsOpen] = useState(false);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [displayedThought, setDisplayedThought] = useState("İstek analiz ediliyor...");
  const [thoughtFade, setThoughtFade] = useState(true);
  const [activeAssistantMsgId, setActiveAssistantMsgId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("anthropic/claude-3.7-sonnet");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingStartTimeRef = useRef<number>(0);
  const thinkingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextThoughtRef = useRef<string | null>(null);
  const lastThoughtSwitchTimeRef = useRef<number>(0);
  const thoughtCooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateThoughtText = (newThought: string) => {
    if (!newThought || newThought === displayedThought) return;
    const now = Date.now();
    const elapsedSinceLastSwitch = now - lastThoughtSwitchTimeRef.current;
    const COOLDOWN_MS = 500; // 0.5s cooldown requested by user

    const applyThought = (text: string) => {
      setThoughtFade(false);
      setTimeout(() => {
        setDisplayedThought(text);
        setThoughtFade(true);
        lastThoughtSwitchTimeRef.current = Date.now();
      }, 150);
    };

    if (elapsedSinceLastSwitch >= COOLDOWN_MS) {
      applyThought(newThought);
    } else {
      nextThoughtRef.current = newThought;
      if (thoughtCooldownTimerRef.current) clearTimeout(thoughtCooldownTimerRef.current);
      thoughtCooldownTimerRef.current = setTimeout(() => {
        if (nextThoughtRef.current) {
          applyThought(nextThoughtRef.current);
          nextThoughtRef.current = null;
        }
      }, COOLDOWN_MS - elapsedSinceLastSwitch);
    }
  };

  const stopThinking = (msgId?: string) => {
    if (thinkingIntervalRef.current) {
      clearInterval(thinkingIntervalRef.current);
      thinkingIntervalRef.current = null;
    }
    const finalSec = parseFloat(((Date.now() - thinkingStartTimeRef.current) / 1000).toFixed(1));
    setIsThinking(false);
    if (msgId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId && !m.thoughtDuration ? { ...m, thoughtDuration: finalSec } : m))
      );
    }
  };


  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    setLoadingAgent(true);

    const loadData = async () => {
      try {
        const agentData = await api.get<Agent>(`/agents/${agentId}`);
        setAgent(agentData);
        if (agentData.model_config_data?.primary_model) {
          setSelectedModel(agentData.model_config_data.primary_model);
        }
        
        // Fetch historical messages
        try {
          const history = await api.get<any[]>(`/agents/${agentId}/messages`);
          const formattedMessages: ChatMessage[] = history.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          
          if (formattedMessages.length === 0) {
             formattedMessages.push({
               id: "welcome",
               role: "assistant",
               content: `Merhaba! Ben ${agentData.name}. Size nasıl yardımcı olabilirim?`,
               timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
             });
          }
          setMessages(formattedMessages);
        } catch (msgErr) {
          console.error("Mesaj geçmişi alınamadı", msgErr);
        }
        
        // Attempt to connect to background stream in case it is still running
        connectToBackgroundStream();
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAgent(false);
      }
    };
    
    loadData();
    
    return () => {
      // cleanup stream if needed
    };
  }, [agentId]);
  
  const connectToBackgroundStream = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") : null;
      if (!token) return;
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (orgId) headers["X-Organization-ID"] = orgId;
      
      const res = await fetch(`${getApiUrl()}/agents/${agentId}/stream`, {
        headers
      });
      
      if (!res.ok || !res.body) return;
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let isActuallyStreaming = false;
      let assistantMsgId = "bg-stream";
      
      const processEvent = (event: any) => {
        if (!event) return;
        if (event.type === "ping") {
          // just an empty stream marker, not actually running
          return;
        }
        
        if (!isActuallyStreaming) {
          isActuallyStreaming = true;
          setIsStreaming(true);
          setIsThinking(true);
          assistantMsgId = (Date.now() + 1).toString();
          setActiveAssistantMsgId(assistantMsgId);
          setMessages(prev => [...prev, {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }]);
          
          thinkingStartTimeRef.current = Date.now();
          lastThoughtSwitchTimeRef.current = Date.now();
          if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
          thinkingIntervalRef.current = setInterval(() => {
            const elapsed = (Date.now() - thinkingStartTimeRef.current) / 1000;
            setThinkingSeconds(parseFloat(elapsed.toFixed(1)));
          }, 100);
        }
        
        if (event.type === "thought") {
          updateThoughtText(event.content);
        } else if (event.type === "tool_call") {
          const tool = event.tool;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, toolEvent: { tool, status: "running" } }
                : m
            )
          );
        } else if (event.type === "tool_result") {
          const tool = event.tool;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, toolEvent: { tool, status: "completed", result: "Başarılı" } }
                : m
            )
          );
        } else if (event.type === "assistant_text") {
          stopThinking(assistantMsgId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: (m.content || "") + event.content }
                : m
            )
          );
        } else if (event.type === "done") {
          stopThinking(assistantMsgId);
          setIsStreaming(false);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // parse chunk...
        // ... handled in the real code via string manipulation. Let me implement properly here:
        const lines = chunk.split("\n");
        for (const line of lines) {
           if (line.startsWith("data: ")) {
              const dataStr = line.substring(6).trim();
              if (!dataStr || dataStr === "[DONE]") continue;
              try {
                const eventData = JSON.parse(dataStr);
                processEvent(eventData);
              } catch(e) {}
           }
        }
      }
      setIsStreaming(false);
      
    } catch (e) {
      console.error(e);
      setIsStreaming(false);
    }
  };
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, displayedThought]);

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
    setActiveAssistantMsgId(assistantMsgId);
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    // Initialize thinking mode
    setIsThinking(true);
    setThinkingSeconds(0);
    setDisplayedThought("İstek analiz ediliyor...");
    setThoughtFade(true);
    thinkingStartTimeRef.current = Date.now();
    lastThoughtSwitchTimeRef.current = Date.now();
    if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
    thinkingIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - thinkingStartTimeRef.current) / 1000;
      setThinkingSeconds(parseFloat(elapsed.toFixed(1)));
    }, 100);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") : null;

      if (!token) {
        stopThinking(assistantMsgId);
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
        stopThinking(assistantMsgId);
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
          updateThoughtText(event.content);
        } else if (event.type === "tool_call") {
          const tool = event.tool;
          if (tool === "file_read") {
            updateThoughtText("Belge okunuyor ve inceleniyor...");
          } else if (tool === "python") {
            updateThoughtText("Python kodu çalıştırılıyor ve veri işleniyor...");
          } else if (tool === "file_write") {
            updateThoughtText("Dosya ve rapor diske kaydediliyor...");
          } else if (tool === "search_knowledge" || tool === "read_document") {
            updateThoughtText("Kurumsal bilgi havuzunda taranıyor...");
          } else if (tool === "web_search") {
            updateThoughtText("Web üzerinde araştırma yapılıyor...");
          } else if (tool === "browser") {
            updateThoughtText("Web tarayıcısı üzerinden otonom işlem yapılıyor...");
          } else {
            updateThoughtText(`'${tool}' aracı çalıştırılıyor...`);
          }
        } else if (event.type === "tool_result") {
          updateThoughtText(`'${event.tool}' tamamlandı, sonuçlar değerlendiriliyor...`);
        } else if (event.type === "permission_denied") {
          updateThoughtText(`Güvenlik engeli: ${event.message}`);
        } else if (event.type === "assistant_text") {
          if (event.content) {
            receivedAnyText = true;
            stopThinking(assistantMsgId);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: m.content + event.content } : m
              )
            );
          }
        } else if (event.type === "error") {
          receivedAnyText = true;
          stopThinking(assistantMsgId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: (m.content ? m.content + "\n\n" : "") + `Hata: ${event.message}` }
                : m
            )
          );
        } else if (event.type === "done") {
          stopThinking(assistantMsgId);
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
        stopThinking(assistantMsgId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId && !m.content
              ? { ...m, content: "İşlem tamamlandı. Talebiniz başarıyla işlendi." }
              : m
          )
        );
      }
    } catch (err: any) {
      stopThinking(assistantMsgId);
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
      stopThinking(assistantMsgId);
      setActiveAssistantMsgId(null);
    }
  };


  
  const AVAILABLE_MODELS = [
    { id: "openai/gpt-6-astra-pro", name: "GPT-6 Astra Pro", provider: "OpenAI" },
    { id: "openai/gpt-6-astra", name: "GPT-6 Astra", provider: "OpenAI" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
    { id: "anthropic/claude-fable-5.1", name: "Claude Fable 5.1", provider: "Anthropic" },
    { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic" },
    { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic" },
    { id: "google/gemini-3.1-pro", name: "Gemini 3.1 Pro", provider: "Google" },
    { id: "google/gemini-3.8-flash", name: "Gemini 3.8 Flash", provider: "Google" },
    { id: "google/gemini-3.7-flash", name: "Gemini 3.7 Flash", provider: "Google" },
    { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", provider: "Google" },
    { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro", provider: "DeepSeek" },
    { id: "deepseek/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", provider: "DeepSeek" },
    { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "DeepSeek" },
    { id: "openrouter/free", name: "OpenRouter Free", provider: "OpenRouter" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "Meta" }
  ];
  
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "OpenAI": return "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg";
      case "Anthropic": return "https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg";
      case "Google": return "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg";
      case "DeepSeek": return "https://chat.deepseek.com/favicon.svg";
      case "Meta": return "https://upload.wikimedia.org/wikipedia/commons/a/ab/Meta-Logo.png";
      default: return "https://openrouter.ai/favicon.ico";
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

  if (loadingAgent || !agent) {
    return (
      <div className="h-[calc(100vh-5.5rem)] flex gap-4 w-full max-w-7xl animate-pulse">
        <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-14 bg-zinc-800/80 rounded-md w-2/3" />
            <div className="h-10 bg-zinc-800/80 rounded-md w-1/2 ml-auto" />
            <div className="h-16 bg-zinc-800/80 rounded-md w-3/4" />
          </div>
          <div className="h-10 bg-zinc-800 rounded-md w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col md:flex-row gap-4 w-full max-w-7xl text-zinc-300">
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
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 hover-glow text-white rounded text-xs font-medium shrink-0 transition-colors duration-75 flex items-center gap-1 cursor-pointer"
              >
                <span>Giriş Yap</span>
              </button>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";

            // If this assistant message is currently thinking and has not yet received final content
            if (!isUser && !msg.content && isThinking && msg.id === activeAssistantMsgId) {
              return (
                <div key={msg.id} className="flex gap-2.5 justify-start">
                  <div className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] font-semibold flex items-center justify-center shrink-0 border border-zinc-700/60 mt-0.5">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="w-full max-w-[85%] sm:max-w-[70%] rounded-lg p-3.5 bg-zinc-950 border border-zinc-800 text-zinc-200 space-y-2.5 shadow-subtle">
                    {/* Header with live timer */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-[11px] font-mono font-medium text-blue-400">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span>Thinking for {thinkingSeconds.toFixed(1)}s</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                        {selectedModel.split("/").pop()}
                      </span>
                    </div>

                    {/* Real-time thought with smooth fade transition & 0.5s cooldown */}
                    <div className="min-h-[22px] flex items-center">
                      <p
                        className={`text-xs text-zinc-300 font-mono transition-opacity duration-150 ${
                          thoughtFade ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        {displayedThought}
                      </p>
                    </div>

                    {/* macOS-style indeterminate loading bar beneath agent thinking bubble */}
                    <div className="macos-loading-track w-full mt-1.5">
                      <div className="macos-loading-indicator" />
                    </div>
                  </div>
                </div>
              );
            }

            // Don't render empty assistant bubble if not thinking or already finished
            if (!isUser && !msg.content) {
              return null;
            }

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
                  {!isUser && msg.thoughtDuration !== undefined && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
                      <Sparkles className="w-3 h-3 text-blue-400" />
                      <span>Thinking for {msg.thoughtDuration}s</span>
                    </div>
                  )}
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

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 relative"
          >
            {/* Custom Model Dropdown */}
            <div className="relative shrink-0" ref={modelDropdownRef}>
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md transition-colors duration-150 h-full"
                title="Model Seçimi"
              >
                {(() => {
                  const activeModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];
                  return (
                    <>
                      <img src={getProviderIcon(activeModel.provider)} alt={activeModel.provider} className="w-3.5 h-3.5 object-contain opacity-80" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      <span className="text-[11px] font-mono text-zinc-300 hidden sm:inline max-w-[120px] truncate">{activeModel.name}</span>
                      {isModelDropdownOpen ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
                    </>
                  );
                })()}
              </button>

              {isModelDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 max-h-72 overflow-y-auto bg-zinc-900 border border-zinc-700 shadow-xl rounded-lg py-1.5 z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950/50 mb-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Aktif Çıkarım Modeli</span>
                  </div>
                  {AVAILABLE_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        handleModelChange(m.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-800 transition-colors ${selectedModel === m.id ? 'bg-zinc-800/80 text-blue-400' : 'text-zinc-300'}`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img src={getProviderIcon(m.provider)} alt={m.provider} className="w-3.5 h-3.5 object-contain shrink-0 opacity-80" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <span className="text-xs font-mono truncate">{m.name}</span>
                      </div>
                      {selectedModel === m.id && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`${agent?.name || "Ajan"} için bir komut veya soru yazın...`}
              disabled={isStreaming}
              className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors duration-75"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 hover-glow disabled:opacity-40 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors duration-75 cursor-pointer shrink-0"
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">Gönder</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
