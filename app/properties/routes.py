from flask import Blueprint, render_template
from app.common.fake_data import dataset

properties_bp = Blueprint("properties", __name__)

@properties_bp.route("/")
def index():
    rows = dataset()["properties"]
    return render_template(
        "list_pages/index.html",
        page_title="Properties",
        rows=rows,
        columns=['name', 'address', 'city', 'units', 'occupied', 'occupancy_pct', 'monthly_rent'],
        table_id="properties-table",
    )
