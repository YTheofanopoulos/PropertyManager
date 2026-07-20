from __future__ import annotations

from contextlib import contextmanager
from threading import Lock
from typing import Iterator

import mariadb

from .config import Settings

_pool: mariadb.ConnectionPool | None = None
_pool_lock = Lock()


def initialize_pool(settings: Settings) -> None:
    global _pool
    with _pool_lock:
        if _pool is None:
            _pool = mariadb.ConnectionPool(
                pool_name="property_manager_pool",
                pool_size=settings.db_pool_size,
                host=settings.db_host,
                port=settings.db_port,
                user=settings.db_user,
                password=settings.db_password,
                database=settings.db_name,
                autocommit=False,
            )


def get_connection() -> mariadb.Connection:
    if _pool is None:
        raise RuntimeError("Database pool has not been initialized")
    return _pool.get_connection()


@contextmanager
def transaction() -> Iterator[mariadb.Connection]:
    connection = get_connection()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


@contextmanager
def read_connection() -> Iterator[mariadb.Connection]:
    connection = get_connection()
    try:
        yield connection
    finally:
        connection.close()
