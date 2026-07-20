from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request
from mariadb import Error as MariaDBError

from ..services.unit_service import (
    UnitConflictError,
    UnitNotFoundError,
    UnitService,
    UnitValidationError,
)

blueprint = Blueprint("units", __name__, url_prefix="/api/v1/units")
service = UnitService()
logger = logging.getLogger(__name__)


def _database_error(exc: Exception):
    logger.exception("Units API database operation failed")
    return jsonify({"error": "The units service is temporarily unavailable."}), 503


@blueprint.get("")
def list_units():
    try:
        return jsonify(service.list_units())
    except (MariaDBError, RuntimeError) as exc:
        return _database_error(exc)


@blueprint.get("/<int:unit_id>")
def get_unit(unit_id: int):
    try:
        return jsonify(service.get_unit(unit_id))
    except UnitNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except (MariaDBError, RuntimeError) as exc:
        return _database_error(exc)


@blueprint.post("")
def create_unit():
    try:
        unit = service.create_unit(request.get_json(silent=True))
        return jsonify(unit), 201
    except UnitValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except UnitConflictError as exc:
        return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError) as exc:
        return _database_error(exc)


@blueprint.put("/<int:unit_id>")
def update_unit(unit_id: int):
    try:
        return jsonify(service.update_unit(unit_id, request.get_json(silent=True)))
    except UnitValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except UnitNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except UnitConflictError as exc:
        return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError) as exc:
        return _database_error(exc)


@blueprint.delete("/<int:unit_id>")
def delete_unit(unit_id: int):
    try:
        service.delete_unit(unit_id)
        return "", 204
    except UnitNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except UnitConflictError as exc:
        return jsonify({"error": str(exc)}), 409
    except (MariaDBError, RuntimeError) as exc:
        return _database_error(exc)
