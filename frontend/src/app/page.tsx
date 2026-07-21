import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">Built for advisor workflows</span>
        <h1>AI copilot with compliance guardrails and auditable decisions</h1>
        <p className="hero-copy">
          FinAdvisor Copilot routes each question to the right specialist agent, retrieves
          grounded evidence, blocks risky recommendation language, and returns cited responses
          with full traceability.
        </p>
        <div className="row">
          <Link className="button-link" href="/register">
            Start demo →
          </Link>
          <Link className="button-link secondary" href="/chat">
            Open chat
          </Link>
        </div>
      </section>

      <section className="stats-grid">
        <article className="card stat-card">
          <h3>3 Specialist Agents</h3>
          <p className="muted">Portfolio, Client Research, and Market Context — each scoped to a distinct knowledge domain.</p>
        </article>
        <article className="card stat-card">
          <h3>Guardrail-first Pipeline</h3>
          <p className="muted">Risky advice language is detected and blocked before any response is generated.</p>
        </article>
        <article className="card stat-card">
          <h3>Citation-only Answers</h3>
          <p className="muted">Every claim is grounded in retrieved source documents with explicit attribution.</p>
        </article>
      </section>

      <section className="feature-grid">
        <article className="card feature-card">
          <h3>Agentic Routing</h3>
          <p>
            Auto-route advisor questions by domain and keep answers scoped to relevant
            context — or choose an agent manually.
          </p>
        </article>
        <article className="card feature-card">
          <h3>Compliance-aware UX</h3>
          <p>
            Guardrail-triggered responses stay safe while still returning useful grounded
            context from the knowledge base.
          </p>
        </article>
        <article className="card feature-card">
          <h3>Full Audit Trail</h3>
          <p>
            Track query, routing decision, response, and guardrail status in a searchable
            per-user audit log view.
          </p>
        </article>
      </section>

      <section className="card cta-strip">
        <div>
          <h3>Ready to run a full demo?</h3>
          <p className="muted">Register, ask a normal query, then trigger a guardrail query and inspect the audit log.</p>
        </div>
        <Link className="button-link" href="/register">
          Get started
        </Link>
      </section>
    </main>
  );
}
