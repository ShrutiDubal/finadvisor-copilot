from datetime import datetime
from typing import Any
import uuid

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr


app = FastAPI(title="FinAdvisor Copilot Demo API", version="demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3010",
        "http://localhost:3020",
        "http://localhost:7020",
        "http://127.0.0.1:3010",
        "http://127.0.0.1:3020",
        "http://127.0.0.1:7020",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChatRequest(BaseModel):
    query: str
    agent: str = "auto"
    top_k: int = 3


USERS: dict[str, dict[str, Any]] = {}
TOKENS: dict[str, str] = {}
CHAT_LOGS: list[dict[str, Any]] = []
NEXT_ID = 1

BLOCKED_PATTERNS = [
    "you should buy",
    "i recommend purchasing",
    "sell your",
    "guaranteed return",
    "will definitely",
    "sure to profit",
]


def _extract_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")
    token = authorization.replace("Bearer ", "", 1).strip()
    email = TOKENS.get(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid auth token")
    return email


def _demo_docs() -> list[dict[str, Any]]:
    return [
        {
            "source": "market_summary_q1_2026.txt",
            "content": "Q1 2026: developed-market equities positive, US large-cap growth led, rates mostly steady.",
            "score": 0.24,
        },
        {
            "source": "fund_factsheet_global_equity.txt",
            "content": "Global Equity Fund AUM is $2.4B with 5-year annualized return 11.2%.",
            "score": 0.31,
        },
    ]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "demo-backend"}


@app.post("/auth/register")
def register(payload: RegisterRequest) -> dict[str, Any]:
    global NEXT_ID
    email = payload.email.lower()
    if email in USERS:
        raise HTTPException(status_code=400, detail="Email already registered")
    USERS[email] = {"id": NEXT_ID, "email": email, "password": payload.password}
    NEXT_ID += 1
    return {"id": USERS[email]["id"], "email": email}


@app.post("/auth/login")
def login(payload: LoginRequest) -> dict[str, str]:
    email = payload.email.lower()
    user = USERS.get(email)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = str(uuid.uuid4())
    TOKENS[token] = email
    return {"access_token": token, "token_type": "bearer"}


@app.post("/chat")
def chat(payload: ChatRequest, email: str = Depends(_extract_user)) -> dict[str, Any]:
    query = payload.query.strip()
    lowered = query.lower()
    docs = _demo_docs()

    guardrail = any(phrase in lowered for phrase in BLOCKED_PATTERNS)
    agent = payload.agent if payload.agent != "auto" else "market_context"

    if guardrail:
        agent = "guardrail_blocked"
        response = (
            "This falls outside what I can advise on directly. "
            "Here is grounded context from available documents."
        )
    else:
        response = (
            "Based on retrieved context, Q1 2026 showed positive developed-market equity performance, "
            "range-bound rates, and continued focus on diversification aligned to client risk profile."
        )

    row = {
        "id": len(CHAT_LOGS) + 1,
        "user_email": email,
        "query": query,
        "agent_used": agent,
        "response": response,
        "guardrail_triggered": guardrail,
        "timestamp": datetime.utcnow().isoformat(),
    }
    CHAT_LOGS.append(row)

    return {
        "query": query,
        "agent_used": agent,
        "guardrail_triggered": guardrail,
        "response": response,
        "retrieved_docs": docs[: max(1, min(payload.top_k, len(docs)))],
    }


@app.get("/logs")
def logs(email: str = Depends(_extract_user)) -> list[dict[str, Any]]:
    out = [x for x in CHAT_LOGS if x["user_email"] == email]
    out.sort(key=lambda x: x["timestamp"], reverse=True)
    return out
