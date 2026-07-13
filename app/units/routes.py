from flask import Blueprint, render_template
from app.common.fake_data import dataset

units_bp = Blueprint("units", __name__)

@units_bp.route("/")
def index():
    rows = dataset()["units"]
    return render_template(
        "list_pages/index.html",
        page_title="Units",
        rows=rows,
        columns=['property', 'unit_number', 'bedrooms', 'bathrooms', 'rent', 'status'],
        table_id="units-table",
    )
