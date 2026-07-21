/* jshint esversion: 8 */
requireAuth();

var loading = false;

// ── Agent selector ─────────────────────────────────────────────────────────────
document.querySelectorAll('.agent-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.agent-btn').forEach(function (b) { b.classList.remove('active'); });
    this.classList.add('active');
    var radio = this.querySelector('input[type=radio]');
    if (radio) radio.checked = true;
  });
});

// ── Top-K slider ───────────────────────────────────────────────────────────────
document.getElementById('topk').addEventListener('input', function () {
  document.getElementById('topk-val').textContent = this.value;
});

// ── Textarea auto-resize ────────────────────────────────────────────────────────
var ta = document.getElementById('chat-input');
ta.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 160) + 'px';
});
ta.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuery(); }
});

function getAgent() {
  var checked = document.querySelector('input[name="agent"]:checked');
  return checked ? checked.value : 'auto';
}
function getTopK() {
  return parseInt(document.getElementById('topk').value, 10);
}
function msgId() {
  return 'msg-' + Math.random().toString(36).slice(2);
}
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Render a single message group ──────────────────────────────────────────────
function appendMsg(role, html, meta, timestamp) {
  var empty = document.getElementById('empty-state');
  if (empty) empty.remove();

  var msgs = document.getElementById('messages');
  var id = msgId();
  var el = document.createElement('div');
  el.className = 'msg-group ' + (role === 'user' ? 'user' : 'assistant');
  el.id = id;

  if (role !== 'user') {
    var header = document.createElement('div');
    header.className = 'msg-header';
    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar ai';
    avatar.textContent = 'AI';
    var sender = document.createElement('span');
    sender.className = 'msg-sender';
    sender.textContent = 'FinAdvisor';
    header.appendChild(avatar);
    header.appendChild(sender);
    el.appendChild(header);
  }

  var bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = html;
  el.appendChild(bubble);

  var footer = document.createElement('div');
  footer.className = 'msg-footer';

  var timeEl = document.createElement('span');
  timeEl.className = 'msg-time';
  timeEl.textContent = timestamp ? fmtTime(timestamp) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  footer.appendChild(timeEl);

  if (meta && meta.agent_used && meta.agent_used !== 'guardrail_blocked') {
    var agentBadge = document.createElement('span');
    agentBadge.className = 'badge neutral';
    agentBadge.textContent = meta.agent_used.replace(/_/g, ' ');
    footer.appendChild(agentBadge);
  }
  if (meta && meta.guardrail_triggered) {
    var gBadge = document.createElement('span');
    gBadge.className = 'badge amber';
    gBadge.textContent = 'Guardrail triggered';
    footer.appendChild(gBadge);
  }
  el.appendChild(footer);

  if (meta && meta.guardrail_triggered) {
    var gw = document.createElement('div');
    gw.className = 'guardrail-banner';
    gw.textContent = 'This response was flagged by the compliance guardrail. Content below is sourced directly from knowledge base documents.';
    el.appendChild(gw);
  }

  if (meta && meta.retrieved_docs && meta.retrieved_docs.length) {
    var docs = meta.retrieved_docs;
    var n = docs.length;

    var btn = document.createElement('button');
    btn.className = 'sources-btn';
    btn.textContent = 'View ' + n + ' source' + (n !== 1 ? 's' : '');

    var srcPanel = document.createElement('div');
    srcPanel.className = 'sources-panel';
    srcPanel.style.display = 'none';

    btn.addEventListener('click', function () {
      if (srcPanel.style.display === 'none') {
        srcPanel.innerHTML = docs.map(function (d) {
          var content = d.content.length > 220 ? d.content.slice(0, 220) + '...' : d.content;
          return '<div class="source-card"><div class="source-card-name">' + esc(d.source) +
            '</div><div class="source-card-text">' + esc(content) + '</div></div>';
        }).join('');
        srcPanel.style.display = '';
        btn.textContent = 'Hide ' + n + ' source' + (n !== 1 ? 's' : '');
      } else {
        srcPanel.style.display = 'none';
        btn.textContent = 'View ' + n + ' source' + (n !== 1 ? 's' : '');
      }
    });

    el.appendChild(btn);
    el.appendChild(srcPanel);
  }

  msgs.appendChild(el);
  return el;
}

function showLoading() {
  var empty = document.getElementById('empty-state');
  if (empty) empty.remove();
  var msgs = document.getElementById('messages');
  var el = document.createElement('div');
  el.className = 'msg-group assistant';
  el.id = 'loading-bubble';

  var header = document.createElement('div');
  header.className = 'msg-header';
  var avatar = document.createElement('div');
  avatar.className = 'msg-avatar ai';
  avatar.textContent = 'AI';
  header.appendChild(avatar);
  el.appendChild(header);

  var bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
  el.appendChild(bubble);
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeLoading() {
  var el = document.getElementById('loading-bubble');
  if (el) el.remove();
}

// ── Load chat history for this account ────────────────────────────────────────
function loadHistory() {
  apiFetch('/logs')
    .then(function (rows) {
      if (!rows || !rows.length) return;

      // API returns newest-first — reverse for chronological display
      var sorted = rows.slice().reverse();
      // Cap at 40 most recent exchanges to keep the view manageable
      if (sorted.length > 40) sorted = sorted.slice(sorted.length - 40);

      sorted.forEach(function (row) {
        appendMsg('user', esc(row.query), null, row.timestamp);
        var html = typeof marked !== 'undefined' && marked.parse
          ? marked.parse(row.response)
          : esc(row.response).replace(/\n/g, '<br>');
        appendMsg('assistant', html, {
          agent_used: row.agent_used,
          guardrail_triggered: row.guardrail_triggered
        }, row.timestamp);
      });

      // Scroll to bottom so user sees the most recent messages
      var msgs = document.getElementById('messages');
      msgs.scrollTop = msgs.scrollHeight;
    })
    .catch(function () {
      // Silently fail — fresh empty chat is fine
    });
}

// ── Send a new query ───────────────────────────────────────────────────────────
function sendQuery(query) {
  var q = (query !== undefined ? query : document.getElementById('chat-input').value).trim();
  if (!q || loading) return;

  loading = true;
  document.getElementById('send-btn').disabled = true;
  document.getElementById('chat-input').value = '';
  document.getElementById('chat-input').style.height = 'auto';

  appendMsg('user', esc(q));
  showLoading();

  apiFetch('/chat', { method: 'POST', body: { query: q, agent: getAgent(), top_k: getTopK() } })
    .then(function (data) {
      removeLoading();
      var html = typeof marked !== 'undefined' && marked.parse
        ? marked.parse(data.response)
        : esc(data.response).replace(/\n/g, '<br>');
      appendMsg('assistant', html, data);
      var msgs = document.getElementById('messages');
      msgs.scrollTop = msgs.scrollHeight;
    })
    .catch(function (err) {
      removeLoading();
      appendMsg('assistant', esc('Error: ' + err.message));
    })
    .finally(function () {
      loading = false;
      document.getElementById('send-btn').disabled = false;
    });
}

// ── Boot ───────────────────────────────────────────────────────────────────────
loadHistory();

(function bindChatUi() {
  var sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', function () { sendQuery(); });
  }
  document.querySelectorAll('.example-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sendQuery(this.textContent.trim());
    });
  });
})();
