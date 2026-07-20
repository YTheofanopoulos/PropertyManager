from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request
from mariadb import Error as MariaDBError

from ..services.building_service import (
    BuildingConflictError,
    BuildingNotFoundError,
    BuildingService,
    BuildingValidationError,
)

blueprint = Blueprint("buildings", __name__, url_prefix="/api/v1/buildings")
service = BuildingService()
logger = logging.getLogger(__name__)


def _database_error():
    logger.exception("Buildings API database operation failed")
    return jsonify({"error": "The buildings service is temporarily unavailable."}), 503


@blueprint.get("")
def list_buildings():
    try:
        return jsonify(service.list_buildings())
    except (MariaDBError, RuntimeError):
        return _database_error()


@blueprint.get("/<int:building_id>")
def get_building(building_id: int):
    try:
        return jsonify(service.get_building(building_id))
    except BuildingNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except (MariaDBError, RuntimeError):
        return _database_error()


@blueprint.post("")
def create_building():
    try:
        return jsonify(service.create_building(request.get_json(silent=True))), 201
    except BuildingValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except BuildingConflictError as exc:
        return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError):
        return _database_error()


@blueprint.put("/<int:building_id>")
def update_building(building_id: int):
    try:
        return jsonify(
            service.update_building(building_id, request.get_json(silent=True))
        )
    except BuildingValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except BuildingNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except BuildingConflictError as exc:
        return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError):
        return _database_error()


@blueprint.delete("/<int:building_id>")
def delete_building(building_id: int):
    try:
        service.delete_building(building_id)
        return "", 204
    except BuildingNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except BuildingConflictError as exc:
        return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError):
        return _database_error()
