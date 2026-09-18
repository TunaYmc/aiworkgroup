export const getApiUrl = () => {
  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;

    // If accessed through reverse proxy (e.g., port 80/443 without explicit port)
    if (port === "80" || port === "443" || port === "") {
      return `${protocol}//${window.location.host}/api/v1`;
    }

    // Direct access to frontend dev port 3000 -> API is on port 8000
    return `${protocol}//${hostname}:8000/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
};

export interface Agent {
  id: string;
  organization_id: string;
  name: string;
  role: string;
  description?: string;
  system_instructions: string;
  status: string;
  model_config_data: {
    primary_model: string;
    fallback_models?: string[];
    temperature?: number;
    max_tokens?: number;
  };
  tool_permissions: {
    allowed_tools: string[];
    denied_tools: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  organization_id: string;
  agent_id: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  input_prompt: string;
  output_result?: string;
  error_message?: string;
  artifacts: any[];
  created_at: string;
  completed_at?: string;
}

export interface ModelItem {
  id: string;
  name: string;
  provider: string;
  context_length: number;
  prompt_price_per_1m: number;
  completion_price_per_1m: number;
  description: string;
  supports_tools: boolean;
  is_default: boolean;
}

export interface FileItem {
  id: string;
  organization_id: string;
  agent_id?: string;
  filename: string;
  mime_type: string;
  size: number;
  status: "processing" | "ready" | "failed";
  created_at: string;
}

export interface UsageSummary {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  period: string;
  by_model: Record<string, number>;
  by_agent: Record<string, number>;
}

class ApiClient {
  private token: string | null = null;
  private currentOrgId: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
      this.currentOrgId = localStorage.getItem("currentOrgId");
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") localStorage.setItem("token", token);
  }

  setOrgId(orgId: string) {
    this.currentOrgId = orgId;
    if (typeof window !== "undefined") localStorage.setItem("currentOrgId", orgId);
  }

  getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = typeof window !== "undefined" ? (localStorage.getItem("token") || this.token) : this.token;
    const orgId = typeof window !== "undefined" ? (localStorage.getItem("currentOrgId") || this.currentOrgId) : this.currentOrgId;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (orgId) {
      headers["X-Organization-ID"] = orgId;
    }
    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${getApiUrl()}${path}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async post<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${getApiUrl()}${path}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API Error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async patch<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${getApiUrl()}${path}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API Error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${getApiUrl()}${path}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status} ${await res.text()}`);
    return res.json();
  }
}

export const api = new ApiClient();
