"use client";

import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type AgentOption = "auto" | "portfolio" | "client_research" | "market_context";

type ChatResponse = {
  response: string;
  agent_used: string;
  guardrail_triggered: boolean;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: string;
};

export default function ChatPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState<AgentOption>("auto");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => getToken(), []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const data = await api.request<ChatResponse>("/chat", {
        method: "POST",
        token,
        body: { query, agent, top_k: 3 },
      });
      const assistant: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        meta: `${data.agent_used}${data.guardrail_triggered ? " • guardrail" : ""}`,
      };
      setMessages((prev) => [...prev, assistant]);
      setQuery("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      if (message.includes("Could not validate credentials")) {
        clearToken();
        router.push("/login");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function extractCitations(text: string): string[] {
    const matches = text.match(/\[Source:\s*([^\]]+)\]/g) ?? [];
    return matches.map((m) => m.replace("[Source:", "").replace("]", "").trim());
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <main className="page stack">
      <div className="row page-header-row">
        <h1>Advisor Chat</h1>
        <div className="row">
          <Link href="/logs">View Audit Logs</Link>
          <button className="danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="chat-layout">
        <aside className="card stack">
          <h3>Agent Selector</h3>
          <select value={agent} onChange={(e) => setAgent(e.target.value as AgentOption)}>
            <option value="auto">Auto-route</option>
            <option value="portfolio">Portfolio</option>
            <option value="client_research">Client Research</option>
            <option value="market_context">Market Context</option>
          </select>
          <p className="muted">Auto-route uses keyword classification.</p>
        </aside>

        <section className="card chat-window stack">
          <div style={{ maxHeight: 420, overflowY: "auto", paddingRight: 6 }}>
            {messages.length === 0 ? (
              <p className="muted">
                Ask a question to start. Responses are markdown-rendered with citations.
              </p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <strong>{message.role === "user" ? "Advisor" : "Copilot"}</strong>
                  {message.meta ? <p className="muted">{message.meta}</p> : null}
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                  {message.role === "assistant" &&
                    extractCitations(message.content).map((source) => (
                      <span className="badge" key={`${message.id}-${source}`}>
                        {source}
                      </span>
                    ))}
                </div>
              ))
            )}
          </div>
          <form onSubmit={submit} className="stack">
            <textarea
              rows={4}
              placeholder="Ask about portfolio risk, client suitability, or market context..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button disabled={loading || !query.trim()}>{loading ? "Sending..." : "Send"}</button>
            {error ? <p className="error">{error}</p> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
