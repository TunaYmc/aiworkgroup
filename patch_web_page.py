import re

with open("apps/web/app/agents/[id]/page.tsx", "r") as f:
    content = f.read()

# Replace the useEffect block for agent fetch and hardcoded initial message
new_use_effect = """
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
"""

# I will replace from `useEffect(() => {` up to `}, [messages, isThinking, displayedThought]);`? No, wait. 
# Just replace the specific useEffect block.
start_idx = content.find("  useEffect(() => {\n    const token = localStorage.getItem(\"token\");")
end_idx = content.find("  useEffect(() => {\n    messagesEndRef", start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_use_effect + content[end_idx:]

with open("apps/web/app/agents/[id]/page.tsx", "w") as f:
    f.write(content)
