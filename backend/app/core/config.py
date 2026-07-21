import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env")


class Settings(BaseModel):
    app_name: str = os.getenv("APP_NAME", "FinAdvisor Copilot API")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./finadvisor.db")
    jwt_secret_key: str = os.getenv(
        "JWT_SECRET_KEY", "change-me-in-env-before-production"
    )
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


settings = Settings()
