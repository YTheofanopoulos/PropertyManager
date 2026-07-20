import logging
from flask import Blueprint,jsonify,request
from mariadb import Error as MariaDBError
from ..services.financial_service import FinancialConflictError,FinancialNotFoundError,FinancialService,FinancialValidationError

blueprint=Blueprint("financial",__name__,url_prefix="/api/v1");service=FinancialService();logger=logging.getLogger(__name__)
def handle(action):
    try:return action()
    except FinancialValidationError as exc:return jsonify({"error":str(exc)}),400
    except FinancialNotFoundError as exc:return jsonify({"error":str(exc)}),404
    except FinancialConflictError as exc:return jsonify({"error":str(exc)}),409
    except (MariaDBError,RuntimeError):logger.exception("Financial API database operation failed");return jsonify({"error":"The financial service is temporarily unavailable."}),503

@blueprint.get("/payments")
def payments():return handle(lambda:jsonify(service.list_payments()))
@blueprint.post("/payments")
def create_payment():return handle(lambda:(jsonify(service.create_payment(request.get_json(silent=True))),201))
@blueprint.post("/payments/<int:payment_id>/void")
def void_payment(payment_id):
    def action():service.void_payment(payment_id,request.get_json(silent=True));return "",204
    return handle(action)
@blueprint.get("/credits")
def credits():return handle(lambda:jsonify(service.list_credits()))
@blueprint.post("/credits/<int:payment_id>/apply")
def apply_credit(payment_id):
    def action():service.apply_credit(payment_id,request.get_json(silent=True));return "",204
    return handle(action)
@blueprint.get("/rent-ledger/leases/<int:lease_id>/outstanding")
def outstanding(lease_id):return handle(lambda:jsonify(service.outstanding(lease_id)))
@blueprint.post("/rent-ledger/ensure")
def ensure():
    def action():service.ensure((request.get_json(silent=True) or {}).get("throughPeriod",""));return "",204
    return handle(action)
@blueprint.get("/rent-ledger/rent-roll")
def rent_roll():return handle(lambda:jsonify(service.rent_roll(request.args.get("period",""))))
@blueprint.post("/rent-ledger/rent-status")
def rent_status():
    payload=request.get_json(silent=True) or {}
    return handle(lambda:jsonify(service.rent_status(payload.get("periods",[]),payload.get("currentPeriod",""))))
