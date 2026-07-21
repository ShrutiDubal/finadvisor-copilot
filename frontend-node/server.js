"use strict";
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ── Demo API (self-contained fallback) ───────────────────────────────────────
const users = new Map(); // email -> { id, email, password }
const tokens = new Map(); // token -> email
const chatLogs = []; // newest appended at end
let nextUserId = 1;

const blockedPatterns = [
  "you should buy",
  "i recommend purchasing",
  "sell your",
  "guaranteed return",
  "will definitely",
  "sure to profit",
];

function authEmail(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  return tokens.get(token) || null;
}

function demoDocs() {
  return [
    {
      source: "market_summary_q1_2026.txt",
      content: "Q1 2026: developed-market equities were positive, US large-cap growth led, and rates were mostly steady.",
      score: 0.24,
    },
    {
      source: "fund_factsheet_global_equity.txt",
      content: "Global Equity Fund AUM is $2.4B with 5-year annualized return of 11.2%.",
      score: 0.31,
    },
  ];
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", mode: "express-demo" });
});

app.post("/auth/register", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password are required" });
  }
  if (users.has(email)) {
    return res.status(400).json({ detail: "Email already registered" });
  }
  const user = { id: nextUserId++, email, password };
  users.set(email, user);
  return res.status(201).json({ id: user.id, email: user.email });
});

app.post("/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = users.get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ detail: "Invalid email or password" });
  }
  const token = `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  tokens.set(token, email);
  return res.json({ access_token: token, token_type: "bearer" });
});

app.post("/chat", (req, res) => {
  const email = authEmail(req);
  if (!email) return res.status(401).json({ detail: "Missing auth token" });

  const query = String(req.body?.query || "").trim();
  const agent = String(req.body?.agent || "auto");
  const topK = Math.max(1, Math.min(10, Number(req.body?.top_k || 3)));
  const lowered = query.toLowerCase();
  const guardrail = blockedPatterns.some((p) => lowered.includes(p));

  const docs = demoDocs().slice(0, topK);
  const agentUsed = guardrail ? "guardrail_blocked" : (agent === "auto" ? "market_context" : agent);
  const response = guardrail
    ? "This falls outside what I can advise on directly. Here is grounded context from retrieved documents."
    : "Based on retrieved context, Q1 2026 market highlights were positive developed-market equity performance, range-bound rates, and continued emphasis on diversification.";

  const row = {
    id: chatLogs.length + 1,
    user_email: email,
    query,
    agent_used: agentUsed,
    response,
    guardrail_triggered: guardrail,
    timestamp: new Date().toISOString(),
  };
  chatLogs.push(row);

  return res.json({
    query,
    agent_used: agentUsed,
    guardrail_triggered: guardrail,
    response,
    retrieved_docs: docs,
  });
});

app.get("/logs", (req, res) => {
  const email = authEmail(req);
  if (!email) return res.status(401).json({ detail: "Missing auth token" });

  const rows = chatLogs
    .filter((x) => x.user_email === email)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return res.json(rows);
});

// ── Layout helper ──────────────────────────────────────────────────────────────
function layout(title, body, extraHead = "") {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} – FinAdvisor Copilot</title>
  <link rel="stylesheet" href="/style.css" />
  ${extraHead}
</head>
<body>
  <header class="site-header">
    <div class="site-header-inner">
      <a class="brand-mark" href="/">
        <div class="brand-icon">💼</div>
        FinAdvisor Copilot
      </a>
      <nav class="header-nav" id="site-nav">
        <a href="/chat">Chat</a>
        <a href="/logs">Audit Log</a>
        <a href="/login" id="nav-login">Login</a>
        <a href="/register" class="nav-cta" id="nav-register">Start demo</a>
        <button id="nav-logout" class="ghost" style="display:none;font-size:13.5px;padding:6px 12px" onclick="clearToken();window.location.href='/login'">Logout</button>
      </nav>
    </div>
  </header>
  <script src="/js/app.js"></script>
  ${body}
  <script>
    (function () {
      var token = getToken();
      if (token) {
        var l = document.getElementById('nav-login');
        var r = document.getElementById('nav-register');
        var lo = document.getElementById('nav-logout');
        if (l) l.style.display = 'none';
        if (r) r.style.display = 'none';
        if (lo) lo.style.display = '';
      }
    })();
  </script>
</body>
</html>`;
}

// ── Landing ────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.send(layout("Home", /* html */ `
<section class="landing-hero">
  <div class="landing-hero-inner">
    <div>
      <div class="hero-tag"><span></span>Built for advisor workflows</div>
      <h1>AI copilot with <em>compliance guardrails</em> and auditable decisions</h1>
      <p>FinAdvisor Copilot routes each question to the right specialist agent, retrieves grounded evidence, blocks risky recommendation language, and returns cited responses with full traceability.</p>
      <div class="hero-actions">
        <a class="btn" href="/register">Start demo →</a>
        <a class="btn outline" href="/chat">Open chat</a>
      </div>
      <div class="hero-stats">
        <div>
          <div class="hero-stat-num">3</div>
          <div class="hero-stat-label">Specialist Agents</div>
        </div>
        <div>
          <div class="hero-stat-num">RAG</div>
          <div class="hero-stat-label">Grounded Retrieval</div>
        </div>
        <div>
          <div class="hero-stat-num">100%</div>
          <div class="hero-stat-label">Auditable Decisions</div>
        </div>
      </div>
    </div>
    <div class="hero-visual">
      <div class="hero-visual-header">
        <div class="hero-visual-dot" style="background:#ff5f57"></div>
        <div class="hero-visual-dot" style="background:#febc2e"></div>
        <div class="hero-visual-dot" style="background:#28c840"></div>
        <span class="hero-visual-title">FinAdvisor Copilot</span>
      </div>
      <div class="hero-msg">
        <div class="hero-msg-user">What is Alice Chen's risk tolerance?</div>
        <div class="hero-msg-ai">
          Based on the client profile, Alice Chen has a <strong>moderate-aggressive</strong> risk tolerance with a 15+ year investment horizon.
          <div class="hero-tag-row">
            <span class="hero-pill">client_research</span>
            <span class="hero-pill">2 sources</span>
          </div>
        </div>
      </div>
      <div class="hero-msg">
        <div class="hero-msg-user">Guaranteed returns on the equity fund?</div>
        <div class="hero-msg-ai" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);color:rgba(255,255,255,0.7)">
          ⚠️ Guardrail triggered — response blocked. Grounded context shown below.
        </div>
      </div>
    </div>
  </div>
</section>

<div class="landing-body">
  <p class="section-label">What it does</p>
  <h2 class="section-title">Compliance-first answers, fully traceable</h2>
  <p class="section-sub">Every response is grounded in retrieved documents. Every decision is logged and reviewable.</p>

  <div class="features-grid">
    <div class="feature-tile">
      <div class="feature-icon">🧭</div>
      <h3>Agentic Routing</h3>
      <p>Auto-route advisor questions by domain and keep answers scoped to relevant context — or choose an agent manually.</p>
    </div>
    <div class="feature-tile">
      <div class="feature-icon">🛡️</div>
      <h3>Compliance Guardrails</h3>
      <p>Risky advice language is detected and blocked before any response is generated — with grounded fallback context.</p>
    </div>
    <div class="feature-tile">
      <div class="feature-icon">📋</div>
      <h3>Full Audit Trail</h3>
      <p>Track query, routing decision, response, and guardrail status in a searchable per-user audit log view.</p>
    </div>
  </div>

  <div class="agents-section">
    <p class="section-label">Specialist Agents</p>
    <h2 class="section-title">Three focused knowledge domains</h2>
    <p class="section-sub">Each agent is scoped to its own knowledge base — no cross-contamination between domains.</p>
    <div class="agents-grid">
      <div class="agent-card">
        <div class="agent-card-num">AGENT 01</div>
        <h3>Portfolio Agent</h3>
        <p>Holdings, allocation, and performance data grounded in current portfolio documents.</p>
        <div class="agent-card-tags">
          <span class="agent-tag">Holdings</span>
          <span class="agent-tag">Allocation</span>
          <span class="agent-tag">Performance</span>
        </div>
      </div>
      <div class="agent-card">
        <div class="agent-card-num">AGENT 02</div>
        <h3>Client Research</h3>
        <p>Client profiles, suitability assessments, and investment goals from CRM documents.</p>
        <div class="agent-card-tags">
          <span class="agent-tag">Profiles</span>
          <span class="agent-tag">Suitability</span>
          <span class="agent-tag">Goals</span>
        </div>
      </div>
      <div class="agent-card">
        <div class="agent-card-num">AGENT 03</div>
        <h3>Market Context</h3>
        <p>Fund data, market highlights, and economic context sourced from market intelligence documents.</p>
        <div class="agent-card-tags">
          <span class="agent-tag">Funds</span>
          <span class="agent-tag">Market Data</span>
          <span class="agent-tag">Economics</span>
        </div>
      </div>
    </div>
  </div>

  <div class="cta-section">
    <div>
      <h2>Ready to run a full demo?</h2>
      <p>Register, ask a normal query, then trigger a guardrail query and inspect the audit log.</p>
    </div>
    <a class="btn" href="/register" style="background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.2);color:#fff;flex-shrink:0">Get started →</a>
  </div>
</div>
`));
});

// ── Auth redirect ──────────────────────────────────────────────────────────────
app.get("/auth", (_req, res) => res.redirect("/login"));

// ── Login ──────────────────────────────────────────────────────────────────────
app.get("/login", (_req, res) => {
  res.send(layout("Login", /* html */ `
<div class="auth-wrap">
  <div class="auth-left">
    <div class="auth-left-brand">
      <div class="auth-left-icon">💼</div>
      FinAdvisor Copilot
    </div>
    <div class="auth-left-content">
      <h2>Compliance-aware financial intelligence</h2>
      <p>AI-powered advisor copilot with guardrails, grounded retrieval, and full audit traceability.</p>
      <div class="auth-left-points">
        <div class="auth-point">
          <div class="auth-point-dot">✓</div>
          <div class="auth-point-text">Specialist agents for every knowledge domain</div>
        </div>
        <div class="auth-point">
          <div class="auth-point-dot">✓</div>
          <div class="auth-point-text">Guardrail-first compliance pipeline</div>
        </div>
        <div class="auth-point">
          <div class="auth-point-dot">✓</div>
          <div class="auth-point-text">Searchable audit log for every decision</div>
        </div>
      </div>
    </div>
    <div class="auth-left-footer">© 2026 FinAdvisor Copilot</div>
  </div>
  <div class="auth-right">
    <div class="auth-form-wrap">
      <h1>Welcome back</h1>
      <p class="auth-sub">Sign in to your FinAdvisor Copilot account.</p>
      <form id="login-form">
        <div class="field">
          <label class="field-label" for="email">Email</label>
          <input id="email" type="email" placeholder="you@example.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label class="field-label" for="password">Password</label>
          <input id="password" type="password" placeholder="••••••••" autocomplete="current-password" required />
        </div>
        <p id="login-error" class="error-msg" style="display:none;margin-bottom:12px"></p>
        <button type="submit" id="login-btn" style="width:100%;margin-top:8px">Sign in</button>
      </form>
      <div class="auth-footer-link">
        Don't have an account? <a href="/register">Create one</a>
      </div>
    </div>
  </div>
</div>
<script>
document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  var btn = document.getElementById('login-btn');
  var errEl = document.getElementById('login-error');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  errEl.style.display = 'none';
  try {
    var data = await apiFetch('/auth/login', {
      method: 'POST',
      body: {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      }
    });
    setToken(data.access_token);
    window.location.href = '/chat';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = '';
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});
</script>
`));
});

// ── Register ───────────────────────────────────────────────────────────────────
app.get("/register", (_req, res) => {
  res.send(layout("Register", /* html */ `
<div class="auth-wrap">
  <div class="auth-left">
    <div class="auth-left-brand">
      <div class="auth-left-icon">💼</div>
      FinAdvisor Copilot
    </div>
    <div class="auth-left-content">
      <h2>Start your demo in seconds</h2>
      <p>Create an account to explore the full RAG pipeline, compliance guardrails, and audit trail.</p>
      <div class="auth-left-points">
        <div class="auth-point">
          <div class="auth-point-dot">✓</div>
          <div class="auth-point-text">Ask questions across 3 specialist agents</div>
        </div>
        <div class="auth-point">
          <div class="auth-point-dot">✓</div>
          <div class="auth-point-text">Trigger compliance guardrails to see them in action</div>
        </div>
        <div class="auth-point">
          <div class="auth-point-dot">✓</div>
          <div class="auth-point-text">Review your full audit log after each session</div>
        </div>
      </div>
    </div>
    <div class="auth-left-footer">© 2026 FinAdvisor Copilot</div>
  </div>
  <div class="auth-right">
    <div class="auth-form-wrap">
      <h1>Create account</h1>
      <p class="auth-sub">Start your FinAdvisor Copilot demo.</p>
      <form id="register-form">
        <div class="field">
          <label class="field-label" for="email">Email</label>
          <input id="email" type="email" placeholder="you@example.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label class="field-label" for="password">Password</label>
          <input id="password" type="password" placeholder="At least 8 characters" autocomplete="new-password" required minlength="8" />
        </div>
        <div class="field">
          <label class="field-label" for="confirm">Confirm password</label>
          <input id="confirm" type="password" placeholder="Repeat password" autocomplete="new-password" required />
        </div>
        <p id="reg-error" class="error-msg" style="display:none;margin-bottom:12px"></p>
        <button type="submit" id="reg-btn" style="width:100%;margin-top:8px">Create account</button>
      </form>
      <div class="auth-footer-link">
        Already have an account? <a href="/login">Sign in</a>
      </div>
    </div>
  </div>
</div>
<script>
document.getElementById('register-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  var btn = document.getElementById('reg-btn');
  var errEl = document.getElementById('reg-error');
  var pw = document.getElementById('password').value;
  var confirm = document.getElementById('confirm').value;
  errEl.style.display = 'none';
  if (pw !== confirm) {
    errEl.textContent = 'Passwords do not match.';
    errEl.style.display = '';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Creating…';
  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: { email: document.getElementById('email').value, password: pw }
    });
    window.location.href = '/login';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = '';
    btn.disabled = false;
    btn.textContent = 'Create account';
  }
});
</script>
`));
});

// ── Chat ───────────────────────────────────────────────────────────────────────
app.get("/chat", (_req, res) => {
  res.send(layout("Chat", /* html */ `
<div class="chat-shell">
  <aside class="chat-sidebar">
    <div class="sidebar-top">
      <p class="sidebar-label">Agent</p>
      <button class="agent-btn active" type="button" data-agent="auto">
        <input type="radio" name="agent" value="auto" checked />
        <div class="agent-btn-indicator"></div>
        <div class="agent-btn-text">
          <div class="agent-btn-name">Auto-route</div>
          <div class="agent-btn-desc">Classify by query keywords</div>
        </div>
      </button>
      <button class="agent-btn" type="button" data-agent="portfolio">
        <input type="radio" name="agent" value="portfolio" />
        <div class="agent-btn-indicator"></div>
        <div class="agent-btn-text">
          <div class="agent-btn-name">Portfolio</div>
          <div class="agent-btn-desc">Holdings &amp; allocation</div>
        </div>
      </button>
      <button class="agent-btn" type="button" data-agent="client_research">
        <input type="radio" name="agent" value="client_research" />
        <div class="agent-btn-indicator"></div>
        <div class="agent-btn-text">
          <div class="agent-btn-name">Client Research</div>
          <div class="agent-btn-desc">Profiles &amp; suitability</div>
        </div>
      </button>
      <button class="agent-btn" type="button" data-agent="market_context">
        <input type="radio" name="agent" value="market_context" />
        <div class="agent-btn-indicator"></div>
        <div class="agent-btn-text">
          <div class="agent-btn-name">Market Context</div>
          <div class="agent-btn-desc">Funds &amp; market data</div>
        </div>
      </button>
    </div>

    <div class="sidebar-divider"></div>

    <div class="topk-section">
      <div class="topk-row">
        <span class="topk-label">Top-K docs</span>
        <span class="topk-val" id="topk-val">3</span>
      </div>
      <input type="range" id="topk" min="1" max="10" value="3" />
    </div>

    <div class="sidebar-bottom">
      <a href="/logs" class="sidebar-nav-link"><span class="icon">📋</span> Audit logs</a>
      <button class="ghost" style="width:100%;justify-content:flex-start;padding:8px 10px;font-size:13px;font-weight:500" onclick="clearToken();window.location.href='/login'">Sign out</button>
    </div>
  </aside>

  <div class="chat-main">
    <div class="chat-topbar">
      <div class="chat-topbar-title">
        <span class="chat-topbar-status"></span>
        FinAdvisor Copilot
      </div>
      <span style="font-size:12px;color:var(--text-3)">Compliance-aware · Grounded · Auditable</span>
    </div>

    <div class="chat-messages" id="messages">
      <div class="chat-empty" id="empty-state">
        <div class="empty-icon">💼</div>
        <h3>FinAdvisor Copilot</h3>
        <p>Ask about client portfolios, suitability profiles, or market context. Every response is grounded in retrieved source documents.</p>
        <div class="example-grid">
          <button type="button" class="example-btn">What is Alice Chen's risk tolerance?</button>
          <button type="button" class="example-btn">Show me the global equity fund AUM</button>
          <button type="button" class="example-btn">What were Q1 2026 market highlights?</button>
          <button type="button" class="example-btn">Summarise Bob Martinez's goals</button>
        </div>
      </div>
    </div>

    <div class="chat-input-wrap">
      <div class="chat-input-box">
        <textarea id="chat-input" rows="1" placeholder="Ask about a portfolio, client, or market…"></textarea>
        <button type="button" id="send-btn" class="send-btn">↑</button>
      </div>
      <p class="input-hint">Enter to send · Shift + Enter for new line</p>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="/js/chat.js"></script>
`));
});

// ── Audit Logs ─────────────────────────────────────────────────────────────────
app.get("/logs", (_req, res) => {
  res.send(layout("Audit Log", /* html */ `
<main class="page stack">
  <div class="logs-header">
    <div>
      <h1>Audit Log</h1>
      <p id="log-subtitle">Your recent advisor queries and responses</p>
    </div>
    <div class="logs-actions">
      <a href="/chat" style="font-size:13.5px">← Back to Chat</a>
      <button class="danger" style="padding:8px 16px;font-size:13.5px" onclick="clearToken();window.location.href='/login'">Logout</button>
    </div>
  </div>

  <p id="log-error" class="error-msg" style="display:none"></p>

  <div class="data-table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:155px">Timestamp</th>
          <th>Query</th>
          <th style="width:160px">Agent</th>
          <th style="width:120px">Guardrail</th>
          <th style="width:60px"></th>
        </tr>
      </thead>
      <tbody id="log-tbody">
        <tr><td colspan="5" style="text-align:center;padding:40px 24px;color:var(--text-3)">Loading…</td></tr>
      </tbody>
    </table>
  </div>
</main>

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
requireAuth();

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

var expanded = new Set();

function toggle(id, response) {
  var tbody = document.getElementById('log-tbody');
  var expandRow = document.getElementById('expand-' + id);
  if (expanded.has(id)) {
    expanded.delete(id);
    if (expandRow) expandRow.remove();
    var mainRow = document.getElementById('row-' + id);
    if (mainRow) mainRow.classList.remove('expanded');
  } else {
    expanded.add(id);
    var mainRow = document.getElementById('row-' + id);
    if (mainRow) mainRow.classList.add('expanded');
    var tr = document.createElement('tr');
    tr.id = 'expand-' + id;
    tr.className = 'expanded-row';
    var td = document.createElement('td');
    td.colSpan = 5;
    td.style.cssText = 'padding:18px 22px';
    var inner = document.createElement('div');
    inner.className = 'log-response';
    inner.innerHTML = marked.parse(response);
    td.appendChild(inner);
    tr.appendChild(td);
    if (mainRow && mainRow.nextSibling) {
      tbody.insertBefore(tr, mainRow.nextSibling);
    } else {
      tbody.appendChild(tr);
    }
  }
  var arrow = document.querySelector('#row-' + id + ' .log-arrow');
  if (arrow) arrow.textContent = expanded.has(id) ? '▲' : '▼';
}

(async function loadLogs() {
  try {
    var rows = await apiFetch('/logs');
    var tbody = document.getElementById('log-tbody');
    var subtitle = document.getElementById('log-subtitle');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px 24px;color:var(--text-3)">No logs yet. Run a few chat requests first.</td></tr>';
      return;
    }
    subtitle.textContent = rows.length + ' request' + (rows.length !== 1 ? 's' : '') + ' — click a row to expand the response';
    tbody.innerHTML = rows.map(function(row) {
      var ts = new Date(row.timestamp).toLocaleString();
      var guardrailBadge = row.guardrail_triggered
        ? '<span class="badge amber">Triggered</span>'
        : '<span class="badge green">Clear</span>';
      var agentLabel = row.agent_used.replace(/_/g,' ');
      var responseJson = JSON.stringify(row.response);
      return '<tr id="row-' + row.id + '" style="cursor:pointer" onclick="toggle(' + row.id + ',' + responseJson + ')">' +
        '<td style="white-space:nowrap;font-size:12px;color:var(--text-3)">' + esc(ts) + '</td>' +
        '<td style="max-width:320px">' + esc(row.query) + '</td>' +
        '<td><span class="badge neutral">' + esc(agentLabel) + '</span></td>' +
        '<td>' + guardrailBadge + '</td>' +
        '<td style="color:var(--text-3);font-size:12px;text-align:right"><span class="log-arrow">▼</span></td>' +
        '</tr>';
    }).join('');
  } catch (err) {
    document.getElementById('log-error').textContent = err.message;
    document.getElementById('log-error').style.display = '';
    document.getElementById('log-tbody').innerHTML = '';
  }
})();
</script>
`));
});

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).send(layout("Not found", `<main class="page"><h1>404 – Page not found</h1><p><a href="/">Go home</a></p></main>`));
});

app.listen(PORT, () => {
  console.log(`FinAdvisor frontend running at http://localhost:${PORT}`);
});
