"""Database session and engine configuration."""

from __future__ import annotations

import os
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.models import Base


def _make_engine(database_url: str) -> Engine:
    """Create a SQLAlchemy engine for the given URL."""
    if database_url.startswith("sqlite"):
        return create_engine(
            database_url,
            connect_args={"check_same_thread": False},
            echo=False,
        )
    return create_engine(database_url, echo=False)


# Default database URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./bhusetu_dev.db",
)

# Module-level engine and session factory
engine: Engine = _make_engine(DATABASE_URL)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Session:
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables defined in the models on the current engine."""
    Base.metadata.create_all(bind=engine)


def check_db() -> bool:
    """Check if the database is reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def reset_engine(database_url: str) -> None:
    """Reset the engine and session factory for a new database URL.

    Used primarily in tests to switch to in-memory SQLite.
    """
    global engine, SessionLocal
    Base.metadata.clear()
    engine = _make_engine(database_url)
    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )