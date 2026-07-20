from __future__ import annotations

import logging
from flask import Blueprint, jsonify, request
from mariadb import Error as MariaDBError
from ..services.tenant_service import (
    TenantConflictError, TenantNotFoundError, TenantService, TenantValidationError,
)

blueprint = Blueprint("tenants", __name__, url_prefix="/api/v1/tenants")
service = TenantService()
logger = logging.getLogger(__name__)


def database_error():
    logger.exception("Tenants API database operation failed")
    return jsonify({"error": "The tenants service is temporarily unavailable."}), 503


@blueprint.get("")
def list_tenants():
    try: return jsonify(service.list_tenants())
    except (MariaDBError, RuntimeError): return database_error()


@blueprint.get("/<int:tenant_id>")
def get_tenant(tenant_id):
    try: return jsonify(service.get_tenant(tenant_id))
    except TenantNotFoundError as exc: return jsonify({"error": str(exc)}), 404
    except (MariaDBError, RuntimeError): return database_error()


@blueprint.post("")
def create_tenant():
    try: return jsonify(service.create_tenant(request.get_json(silent=True))), 201
    except TenantValidationError as exc: return jsonify({"error": str(exc)}), 400
    except TenantConflictError as exc: return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError): return database_error()


@blueprint.put("/<int:tenant_id>")
def update_tenant(tenant_id):
    try: return jsonify(service.update_tenant(tenant_id, request.get_json(silent=True)))
    except TenantValidationError as exc: return jsonify({"error": str(exc)}), 400
    except TenantNotFoundError as exc: return jsonify({"error": str(exc)}), 404
    except TenantConflictError as exc: return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError): return database_error()


@blueprint.delete("/<int:tenant_id>")
def delete_tenant(tenant_id):
    try:
        service.delete_tenant(tenant_id)
        return "", 204
    except TenantNotFoundError as exc: return jsonify({"error": str(exc)}), 404
    except TenantConflictError as exc: return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError): return database_error()
