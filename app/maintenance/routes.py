from flask import Blueprint, render_template
from app.common.fake_data import dataset

maintenance_bp = Blueprint("maintenance", __name__)

@maintenance_bp.route("/")
def index():
    rows = dataset()["maintenance"]
    return render_template(
        "list_pages/index.html",
        page_title="Maintenance",
        rows=rows,
        columns=['opened', 'property', 'unit', 'priority', 'status', 'description'],
        table_id="maintenance-table",
    )
