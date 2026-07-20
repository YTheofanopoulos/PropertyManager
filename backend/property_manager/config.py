from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


@dataclass(frozen=True)
class Settings:
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    db_pool_size: int
    flask_debug: bool
    log_level: str

    @classmethod
    def from_environment(cls) -> "Settings":
        return cls(
            db_host=os.getenv("PM_DB_HOST", "localhost"),
            db_port=int(os.getenv("PM_DB_PORT", "3306")),
            db_name=os.getenv("PM_DB_NAME", "property_manager"),
            db_user=_required("PM_DB_USER"),
            db_password=_required("PM_DB_PASSWORD"),
            db_pool_size=int(os.getenv("PM_DB_POOL_SIZE", "5")),
            flask_debug=os.getenv("PM_FLASK_DEBUG", "false").lower() in {"1", "true", "yes"},
            log_level=os.getenv("PM_LOG_LEVEL", "INFO").upper(),
        )
