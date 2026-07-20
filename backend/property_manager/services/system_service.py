from __future__ import annotations

from .. import API_VERSION, APPLICATION_VERSION, DATABASE_SCHEMA_VERSION
from ..repositories.system_repository import SystemRepository


class SystemService:
    def __init__(self, repository: SystemRepository | None = None) -> None:
        self.repository = repository or SystemRepository()

    def system_info(self) -> dict[str, object]:
        database = self.repository.ping()
        return {
            "applicationVersion": APPLICATION_VERSION,
            "apiVersion": API_VERSION,
            "expectedSchemaVersion": DATABASE_SCHEMA_VERSION,
            "database": database,
        }
