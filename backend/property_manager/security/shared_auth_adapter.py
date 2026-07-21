from __future__ import annotations

import importlib
import sys
from dataclasses import dataclass
from pathlib import Path


class SharedAuthConfigurationError(RuntimeError):
    """Raised when the configured SharedAuth installation cannot be loaded."""


@dataclass(frozen=True)
class AuthIdentity:
    username: str
    token: str
    remember: int
    global_level: int
    scopes: dict[str, int]

    def level_for(self, scope: str) -> int:
        if self.global_level == 99:
            return 99
        return int(self.scopes.get(scope, 0))


class SharedAuthAdapter:
    """Adapter over the reusable service beneath the Login compatibility API.

    SharedAuth remains responsible for passwords, MongoDB user records, token
    expiry, remember-me behavior, logout, and the one-active-token policy.
    """

    def __init__(self, login_directory: str, database: str, scope: str):
        self.scope = scope
        backend_class, request_class, service_class = self._load_shared_auth(login_directory)
        self._backend = backend_class(database)
        self._request_class = request_class
        self._service = service_class(self._backend)

    @staticmethod
    def _load_shared_auth(login_directory: str):
        directory = Path(login_directory).expanduser().resolve()
        if not (directory / "mongoclass.py").is_file() or not (directory / "shared_auth").is_dir():
            raise SharedAuthConfigurationError(
                f"PM_AUTH_PATH does not contain mongoclass.py and shared_auth/: {directory}"
            )

        directory_text = str(directory)
        if directory_text not in sys.path:
            sys.path.insert(0, directory_text)

        backend_module = importlib.import_module("mongoclass")
        auth_module = importlib.import_module("shared_auth")
        return backend_module.DatabaseAccess, auth_module.AuthRequest, auth_module.AuthService

    def login(self, username: str, password: str, remember: bool) -> AuthIdentity:
        result = self._service.login(
            self._request_class(
                username=username,
                password=password,
                remember=1 if remember else 0,
                collection=self.scope,
                operation="login",
            )
        )
        if not result.success or result.user is None or result.token is None:
            raise PermissionError(str(result.error or "Invalid credentials"))
        return self._from_result(result)

    def authenticate(self, username: str, token: str) -> AuthIdentity:
        result = self._service.authenticate(username, token)
        if not result.success or result.user is None or result.token is None:
            raise PermissionError(str(result.error or "Invalid or expired session"))
        return self._from_result(result)

    @staticmethod
    def _from_result(result) -> AuthIdentity:
        return AuthIdentity(
            username=result.user.username,
            token=result.token,
            remember=int(result.remember or 0),
            global_level=int(result.user.global_level),
            scopes={str(key): int(value) for key, value in result.user.collections.items()},
        )

    def logout(self, username: str) -> None:
        key, message = self._backend._ClearToken(username)
        if key != "Success":
            raise RuntimeError(str(message or "Unable to log out"))
