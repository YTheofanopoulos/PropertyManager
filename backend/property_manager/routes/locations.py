from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request
from mariadb import Error as MariaDBError

from ..services.location_service import (
    LocationConflictError,
    LocationNotFoundError,
    LocationService,
    LocationValidationError,
)

blueprint = Blueprint("locations", __name__, url_prefix="/api/v1/locations")
service = LocationService()
logger = logging.getLogger(__name__)


def _database_error():
    logger.exception("Locations API database operation failed")
    return jsonify({"error": "The locations service is temporarily unavailable."}), 503


@blueprint.get("")
def list_locations():
    try:
        return jsonify(service.list_locations())
    except (MariaDBError, RuntimeError):
        return _database_error()


@blueprint.get("/<int:location_id>")
def get_location(location_id: int):
    try:
        return jsonify(service.get_location(location_id))
    except LocationNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except (MariaDBError, RuntimeError):
        return _database_error()


@blueprint.post("")
def create_location():
    try:
        return jsonify(service.create_location(request.get_json(silent=True))), 201
    except LocationValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except LocationConflictError as exc:
        return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError):
        return _database_error()


@blueprint.put("/<int:location_id>")
def update_location(location_id: int):
    try:
        return jsonify(
            service.update_location(location_id, request.get_json(silent=True))
        )
    except LocationValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except LocationNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except LocationConflictError as exc:
        return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError):
        return _database_error()


@blueprint.delete("/<int:location_id>")
def delete_location(location_id: int):
    try:
        service.delete_location(location_id)
        return "", 204
    except LocationNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except LocationConflictError as exc:
        return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError):
        return _database_error()
