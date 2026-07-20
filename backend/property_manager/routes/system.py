from __future__ import annotations

from flask import Blueprint, jsonify
from mariadb import Error as MariaDBError

from ..services.system_service import SystemService

blueprint = Blueprint("system", __name__, url_prefix="/api/v1/system")
service = SystemService()


@blueprint.get("/health")
def health():
    try:
        info = service.system_info()
        return jsonify({"status": "ok", **info})
    except (MariaDBError, RuntimeError) as exc:
        return jsonify({"status": "error", "message": str(exc)}), 503


@blueprint.get("/info")
def info():
    return health()
