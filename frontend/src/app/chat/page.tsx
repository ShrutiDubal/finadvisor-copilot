"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type RetrievedDoc = {
  source: string;
  content: string;
  score: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent_used?: string;
  guardrail_triggered?: boolean;
  retrieved_docs?: RetrievedDoc[];
  timestamp: Date;
};

type AgentOption = "auto" | "portfolio" | "client_research" | "market_context";

const AGENTS: { value: AgentOption; label: string; desc: string }[] = [
  { value: "auto", label: "Auto-route", desc: "Classify by query keywords" },
  { value: "portfolio", label: "Portfolio", desc: "Holdings & allocation" },
  { value: "client_research", label: "Client Research", desc: "Profiles & suitability" },
  { value: "market_context", label: "Market Context", desc: "Funds & market data" },
];

const EXAMPLE_QUERIES = [
  "What is Alice Chen's risk tolerance?",
  "Summarise Bob Martinez's investment goals",
  "What were Q1 2026 market highlights?",
  "Show me the global equity fund AUM",
  "What is Sarah Johnson's investment horizon?",
  "Compare Alice Chen and Bob Martinez risk profiles",
  "What are the key risks in the current market outlook?",
  "Which clients are suitable for conservative fixed income products?",
  "What is the fund's expense ratio?",
  "Summarise Q1 2026 regional equity performance",
];

function agentLabel(agent: string) {
  return agent.replace(/_/g, " ");
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState<AgentOption>("auto");
  const [topK, setTopK] = useState(3);
  const [openSources, setOpenSources] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const token = getToken();

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    api.request<{ messages: Array<{
      id: number; query: string; response: string;
      agent_used: string; guardrail_triggered: boolean;
    }> }>("/chat/history", { method: "GET", token })
      .then(({ messages }) => {
        const loaded: Message[] = [];
        messages.forEach((m) => {
          loaded.push({ id: `h-u-${m.id}`, role: "user", content: m.query, timestamp: new Date() });
          loaded.push({ id: `h-a-${m.id}`, role: "assistant", content: m.response, agent_used: m.agent_used, guardrail_triggered: m.guardrail_triggered, timestamp: new Date() });
        });
        setMessages(loaded);
      })
      .catch(() => {});
  }, [router, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function toggleSources(id: string) {
    setOpenSources((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function send(query: string) {
    const q = query.trim();
    if (!q || loading || !token) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: q, timestamp: new Date() },
    ]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const data = await api.request<{
        response: string;
        agent_used: string;
        guardrail_triggered: boolean;
        retrieved_docs: RetrievedDoc[];
      }>("/chat", { method: "POST", token, body: { query: q, agent, top_k: topK } });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          agent_used: data.agent_used,
          guardrail_triggered: data.guardrail_triggered,
          retrieved_docs: data.retrieved_docs,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Request failed"}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="chat-page">
      {/* ── Sidebar ── */}
      <aside className="chat-sidebar">
        <div>
          <p className="sidebar-section-title">Agent</p>
          {AGENTS.map((opt) => (
            <label key={opt.value} className="agent-option">
              <input
                type="radio"
                name="agent"
                value={opt.value}
                checked={agent === opt.value}
                onChange={() => setAgent(opt.value)}
              />
              <div>
                <div className="agent-option-label">{opt.label}</div>
                <div className="agent-option-desc">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div>
          <p className="sidebar-section-title">Retrieval</p>
          <div className="range-row">
            <span className="range-label">Top-K docs</span>
            <span className="range-value">{topK}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
        </div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <a
            href="/logs"
            style={{
              display: "block",
              textAlign: "center",
              fontSize: 13,
              color: "var(--c-text-3)",
              padding: "8px",
              borderRadius: "var(--r-sm)",
            }}
          >
            View audit logs →
          </a>
          <button className="ghost" style={{ width: "100%" }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="chat-main">
        <div className="chat-messages">
          {messages.length === 0 && !loading ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">💬</div>
              <h3>FinAdvisor Copilot</h3>
              <p>
                Ask about client portfolios, suitability profiles, or market context. Every
                response is grounded in retrieved source documents.
              </p>
              <div className="chat-example-queries">
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    className="example-query-btn"
                    onClick={() => send(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`msg msg--${msg.role}`}>
                <div className="msg-bubble">
                  {msg.role === "assistant" ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>

                <div className="msg-meta">
                  <span className="msg-time">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.agent_used && msg.agent_used !== "guardrail_blocked" && (
                    <span className="badge neutral">{agentLabel(msg.agent_used)}</span>
                  )}
                  {msg.guardrail_triggered && (
                    <span className="badge amber">Guardrail triggered</span>
                  )}
                </div>

                {msg.guardrail_triggered && (
                  <div className="guardrail-warning">
                    ⚠️ This response was flagged by the compliance guardrail. Content below is
                    sourced directly from knowledge base documents.
                  </div>
                )}

                {msg.retrieved_docs &&
                  msg.retrieved_docs.length > 0 &&
                  !msg.guardrail_triggered && (
                  <>
                    <button
                      className="sources-toggle"
                      onClick={() => toggleSources(msg.id)}
                    >
                      {openSources.has(msg.id) ? "Hide" : "View"}{" "}
                      {msg.retrieved_docs.length} source
                      {msg.retrieved_docs.length !== 1 ? "s" : ""}
                    </button>
                    {openSources.has(msg.id) && (
                      <div className="sources-list">
                        {msg.retrieved_docs.map((doc, i) => (
                          <div key={i} className="source-item">
                            <div className="source-name">{doc.source}</div>
                            <div className="source-content">
                              {doc.content.length > 220
                                ? doc.content.slice(0, 220) + "…"
                                : doc.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="msg msg--assistant">
              <div className="msg-bubble">
                <div className="loading-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ── */}
        <div className="chat-input-bar">
          <div className="chat-input-row">
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              disabled={loading}
              placeholder="Ask about a portfolio, client, or market… (Enter to send)"
              onChange={(e) => {
                setInput(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
          <p className="chat-hint">Shift + Enter for a new line</p>
        </div>
      </div>
    </div>
  );
}
