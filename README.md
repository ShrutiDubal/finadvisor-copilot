# FinAdvisor Copilot

Compliance-aware, multi-agent financial advisor copilot with grounded retrieval, guardrails, and audit logging.

## What We Built

FinAdvisor Copilot is an end-to-end demo app designed for advisor workflows:

- Multi-agent query routing (`portfolio`, `client_research`, `market_context`, plus `auto` mode).
- Retrieval-augmented generation (RAG) using local knowledge base files + FAISS embeddings.
- Compliance guardrail checks before and after generation.
- Grounded responses that include retrieved source docs in API payloads.
- JWT auth with register/login and protected chat/logs endpoints.
- SQLite audit trail of user interactions and guardrail outcomes.
- Two frontend options:
  - `frontend/`: Next.js app (recommended, runs on `3020`).
  - `frontend-node/`: Express-rendered UI (runs on `3010`).

---

## Tech Stack

### Backend

- Python
- FastAPI
- SQLAlchemy
- SQLite
- JWT auth (`python-jose`)
- Password hashing (`bcrypt`)
- `faiss-cpu`
- `sentence-transformers` (`all-MiniLM-L6-v2`)
- Gemini (`google-generativeai`)

### Frontend (Primary)

- Next.js `16.2.5`
- React `19`
- TypeScript
- `react-markdown`

### Frontend (Alternate Legacy UI)

- Node.js
- Express
- Vanilla JS + server-rendered HTML

---

## Repository Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── core/            # settings, security
│   │   ├── db/              # SQLAlchemy engine/session/base
│   │   ├── deps/            # auth dependency helpers
│   │   ├── models/          # User, ChatMessage, AuditLog
│   │   ├── routers/         # auth, chat, logs, health
│   │   └── services/        # RAG, guardrail, router, LLM pipeline
│   ├── data/knowledge_base/ # source .txt docs used for retrieval
│   ├── requirements.txt
│   └── .env                 # local secrets (not committed)
├── frontend/                # Next.js UI
└── frontend-node/           # Express UI
```

---

## Core Product Flow

1. User authenticates (`/auth/register`, `/auth/login`) and gets JWT.
2. User sends query to `POST /chat`.
3. Backend retrieves top-k context from FAISS index.
4. Guardrail checks the query:
   - If blocked phrase is detected, return safe fallback from retrieved docs.
5. If allowed, router chooses agent (`auto` or explicit).
6. Gemini generates response using strict “context-only” instructions.
7. Guardrail checks generated response again.
8. Backend stores audit + chat records in SQLite.
9. Response is returned with `agent_used`, `guardrail_triggered`, and `retrieved_docs`.

---

## Compliance Guardrail (Current Rules)

Guardrail trigger patterns are phrase-based (case-insensitive), e.g.:

- `you should buy`
- `i recommend purchasing`
- `sell your`
- `guaranteed return`
- `will definitely`
- `sure to profit`

When triggered, the system avoids direct advisory output and returns a safe, grounded fallback summary.

---

## Environment Variables

Create `backend/.env`:

```env
APP_NAME=FinAdvisor Copilot API
DATABASE_URL=sqlite:///./finadvisor.db
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=your_google_gemini_key
GEMINI_MODEL=gemini-2.5-flash
```

---

## Local Setup

## 1) Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API base URL: `http://localhost:8000`

> Note: FAISS index is built at backend startup from `backend/data/knowledge_base/*.txt`. Restart backend after editing KB files.

## 2) Frontend (Recommended: Next.js)

```bash
cd frontend
npm install
npm run dev
```

UI URL: `http://localhost:3020`

## 3) Alternate Frontend (Express)

```bash
cd frontend-node
npm install
npm start
```

UI URL: `http://localhost:3010`

---

## API Endpoints

### Health

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Chat / Pipeline

- `GET /chat/status`
- `POST /chat/retrieve`
- `POST /chat/guardrail-check`
- `POST /chat/agent-run`
- `POST /chat` (main endpoint)

### Logs

- `GET /logs/status` (auth required)
- `GET /logs` (auth required)

---

## Demo Script (TIFIN Intro Style)

1. Register a new user.
2. Ask a normal market question:
   - “What were Q1 2026 market highlights?”
3. Ask a portfolio/client question:
   - “What is Alice Chen’s risk tolerance?”
4. Trigger guardrail:
   - “You should buy more global equity fund for Alice Chen—how much?”
5. Open Audit Logs and show:
   - agent used
   - guardrail flag
   - timestamp
   - saved response history

