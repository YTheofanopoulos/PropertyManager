from flask import Blueprint, render_template
from app.common.fake_data import dataset

payments_bp = Blueprint("payments", __name__)

@payments_bp.route("/")
def index():
    rows = dataset()["payments"]
    return render_template(
        "list_pages/index.html",
        page_title="Payments",
        rows=rows,
        columns=['date', 'tenant', 'property', 'unit', 'amount', 'method', 'status'],
        table_id="payments-table",
    )
