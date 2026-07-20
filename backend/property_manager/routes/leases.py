from __future__ import annotations

import logging
from flask import Blueprint, jsonify, request
from mariadb import Error as MariaDBError
from ..services.lease_service import (
    LeaseConflictError, LeaseNotFoundError, LeaseService, LeaseValidationError,
)

blueprint = Blueprint("leases", __name__, url_prefix="/api/v1/leases")
service = LeaseService()
logger = logging.getLogger(__name__)


def database_error():
    logger.exception("Leases API database operation failed")
    return jsonify({"error": "The leases service is temporarily unavailable."}), 503


def handle(action):
    try: return action()
    except LeaseValidationError as exc: return jsonify({"error": str(exc)}), 400
    except LeaseNotFoundError as exc: return jsonify({"error": str(exc)}), 404
    except LeaseConflictError as exc: return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError): return database_error()


@blueprint.get("")
def list_leases(): return handle(lambda: jsonify(service.list_leases()))


@blueprint.get("/<int:lease_id>")
def get_lease(lease_id): return handle(lambda: jsonify(service.get_lease(lease_id)))


@blueprint.get("/<int:lease_id>/participants")
def participants(lease_id): return handle(lambda: jsonify(service.participants(lease_id)))


@blueprint.get("/<int:lease_id>/charges")
def charges(lease_id): return handle(lambda: jsonify(service.charges(lease_id)))


@blueprint.get("/<int:lease_id>/concessions")
def concessions(lease_id): return handle(lambda: jsonify(service.concessions(lease_id)))


@blueprint.post("")
def create_lease():
    return handle(lambda: (jsonify(service.save(request.get_json(silent=True))), 201))


@blueprint.put("/<int:lease_id>")
def update_lease(lease_id):
    return handle(lambda: jsonify(service.save(request.get_json(silent=True), lease_id)))


@blueprint.post("/<int:lease_id>/terminate")
def terminate_lease(lease_id):
    def terminate():
        service.terminate(lease_id)
        return "", 204
    return handle(terminate)
