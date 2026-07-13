from flask import Blueprint, render_template

from app.common.fake_data import dataset

units_bp = Blueprint("units", __name__)


@units_bp.route("/")
def index():
    return render_template(
        "list_pages/index.html",
        page_title="Units",
        rows=dataset()["units"],
        columns=[
            "property",
            "address",
            "unit_number",
            "bedrooms",
            "bathrooms",
            "rent",
            "status",
        ],
        column_labels={
            "property": "Street",
            "address": "Civic Address",
            "unit_number": "Apartment Number",
            "bedrooms": "Bedrooms",
            "bathrooms": "Bathrooms",
            "rent": "Monthly Rent",
            "status": "Status",
        },
        table_id="units-table",
    )
