from __future__ import annotations

from flask import Flask, g, jsonify, request

from .shared_auth_adapter import AuthIdentity, SharedAuthAdapter

PUBLIC_API_PATHS = {
    "/api/v1",
    "/api/v1/auth/login",
}


def install_authentication(app: Flask, adapter: SharedAuthAdapter) -> None:
    settings = app.config["PM_SETTINGS"]

    @app.before_request
    def authenticate_api_request():
        if not request.path.startswith("/api/v1") or request.path in PUBLIC_API_PATHS:
            return None

        username = request.headers.get("X-PM-Username", "").strip()
        token = request.headers.get("X-PM-Token", "").strip()
        if not username or not token:
            return jsonify({"error": "Authentication is required."}), 401

        try:
            identity = adapter.authenticate(username, token)
        except PermissionError:
            return jsonify({"error": "The session is invalid or has expired."}), 401

        g.auth_identity = identity
        if request.path in {"/api/v1/auth/session", "/api/v1/auth/logout"}:
            return None

        required = (
            settings.auth_read_level
            if request.method in {"GET", "HEAD", "OPTIONS"}
            else settings.auth_write_level
        )
        if identity.level_for(settings.auth_scope) < required:
            return jsonify({"error": "You do not have permission for this operation."}), 403

        return None


def current_identity() -> AuthIdentity:
    identity = getattr(g, "auth_identity", None)
    if identity is None:
        raise RuntimeError("No authenticated identity is available")
    return identity
