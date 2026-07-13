from flask import Blueprint, render_template
from app.common.fake_data import dataset

tenants_bp = Blueprint("tenants", __name__)

@tenants_bp.route("/")
def index():
    rows = dataset()["tenants"]
    return render_template(
        "list_pages/index.html",
        page_title="Tenants",
        rows=rows,
        columns=['name', 'property', 'unit', 'phone', 'email', 'balance', 'status'],
        table_id="tenants-table",
    )
