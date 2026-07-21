import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base
from app.db.session import engine
from app.models import AuditLog, ChatMessage, User  # noqa: F401
from app.routers.auth import router as auth_router
from app.routers.chat import router as chat_router
from app.routers.health import router as health_router
from app.routers.logs import router as logs_router
from app.services.rag_service import rag_service

_DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3020",
    "http://127.0.0.1:3020",
]


def _get_allowed_origins() -> list[str]:
    extra = os.getenv("CORS_ORIGINS", "")
    extras = [o.strip() for o in extra.split(",") if o.strip()]
    return _DEFAULT_ORIGINS + extras


def create_app() -> FastAPI:
    app = FastAPI(title="FinAdvisor Copilot API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def startup_event() -> None:
        # Keep startup fast/reliable for demos. RAG initializes lazily on first retrieval.
        return None

    Base.metadata.create_all(bind=engine)
    app.include_router(auth_router)
    app.include_router(chat_router)
    app.include_router(health_router)
    app.include_router(logs_router)
    return app


app = create_app()
