from flask import Blueprint, render_template
from app.common.fake_data import dataset

leases_bp = Blueprint("leases", __name__)

@leases_bp.route("/")
def index():
    rows = dataset()["leases"]
    return render_template(
        "list_pages/index.html",
        page_title="Leases",
        rows=rows,
        columns=['tenant', 'property', 'unit', 'start_date', 'end_date', 'monthly_rent', 'status'],
        table_id="leases-table",
    )
