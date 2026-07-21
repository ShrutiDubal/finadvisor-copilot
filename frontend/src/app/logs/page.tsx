"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type LogRow = {
  id: number;
  query: string;
  agent_used: string;
  response: string;
  guardrail_triggered: boolean;
  timestamp: string;
};

export default function LogsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const token = getToken();

  useEffect(() => {
    async function loadLogs() {
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const data = await api.request<LogRow[]>("/logs", { method: "GET", token });
        setRows(data);
      } catch (err) {
        setError((err as Error).message);
      }
    }
    loadLogs();
  }, [router, token]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <main className="page stack">
      <div className="row page-header-row">
        <div className="logs-header">
          <h1>Audit Log</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {rows.length > 0
              ? `${rows.length} request${rows.length !== 1 ? "s" : ""} — click a row to expand the response`
              : "Your recent advisor queries and responses"}
          </p>
        </div>
        <div className="row">
          <Link href="/chat" style={{ fontSize: 13.5 }}>
            ← Back to Chat
          </Link>
          <button
            className="danger"
            style={{ padding: "8px 16px", fontSize: 13.5 }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 155 }}>Timestamp</th>
              <th>Query</th>
              <th style={{ width: 160 }}>Agent</th>
              <th style={{ width: 120 }}>Guardrail</th>
              <th style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="muted"
                  style={{ textAlign: "center", padding: "40px 24px" }}
                >
                  No logs yet. Run a few chat requests first.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <RowGroup
                  key={row.id}
                  row={row}
                  isExpanded={expanded.has(row.id)}
                  onToggle={() => toggle(row.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function RowGroup({
  row,
  isExpanded,
  onToggle,
}: {
  row: LogRow;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={isExpanded ? "expanded" : ""}
        onClick={onToggle}
        style={{ cursor: "pointer" }}
      >
        <td
          style={{
            whiteSpace: "nowrap",
            fontSize: 12,
            color: "var(--c-text-3)",
          }}
        >
          {new Date(row.timestamp).toLocaleString()}
        </td>
        <td style={{ maxWidth: 320 }}>{row.query}</td>
        <td>
          <span className="badge neutral">
            {row.agent_used.replace(/_/g, " ")}
          </span>
        </td>
        <td>
          <span className={`badge ${row.guardrail_triggered ? "amber" : "green"}`}>
            {row.guardrail_triggered ? "Triggered" : "Clear"}
          </span>
        </td>
        <td
          style={{
            color: "var(--c-text-3)",
            fontSize: 12,
            textAlign: "right",
          }}
        >
          {isExpanded ? "▲" : "▼"}
        </td>
      </tr>

      {isExpanded && (
        <tr className="expanded-row">
          <td
            colSpan={5}
            style={{ padding: "18px 22px", background: "#f8faff" }}
          >
            <div
              style={{
                fontSize: 13.5,
                color: "var(--c-text-2)",
                lineHeight: 1.65,
              }}
            >
              <ReactMarkdown>{row.response}</ReactMarkdown>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
