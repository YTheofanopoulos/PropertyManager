from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from ..security.middleware import current_identity

blueprint = Blueprint("auth", __name__, url_prefix="/api/v1/auth")


@blueprint.after_request
def prevent_auth_response_caching(response):
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return response


def _adapter():
    return current_app.extensions["pm_shared_auth"]


def _payload(identity):
    settings = current_app.config["PM_SETTINGS"]
    level = identity.level_for(settings.auth_scope)
    return {
        "token": {
            "hash": identity.token,
            "userName": identity.username,
            "remember": identity.remember,
            "level": identity.global_level,
            "collections": identity.scopes,
        },
        "authorization": {
            "scope": settings.auth_scope,
            "scopeLevel": level,
            "canRead": level >= settings.auth_read_level,
            "canWrite": level >= settings.auth_write_level,
            "administrator": identity.global_level == 99,
        },
    }


@blueprint.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    remember = bool(data.get("remember", False))
    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400
    try:
        identity = _adapter().login(username, password, remember)
    except PermissionError:
        return jsonify({"error": "Invalid username or password."}), 401

    settings = current_app.config["PM_SETTINGS"]
    if identity.level_for(settings.auth_scope) < settings.auth_read_level:
        _adapter().logout(identity.username)
        return jsonify({"error": "This account does not have PropertyManager access."}), 403
    return jsonify(_payload(identity))


@blueprint.get("/session")
def session():
    return jsonify(_payload(current_identity()))


@blueprint.post("/logout")
def logout():
    identity = current_identity()
    _adapter().logout(identity.username)
    return "", 204
