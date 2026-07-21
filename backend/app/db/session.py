from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


_db_url = settings.database_url.replace("postgres://", "postgresql://", 1)
_is_sqlite = _db_url.startswith("sqlite")
engine = create_engine(
    _db_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
