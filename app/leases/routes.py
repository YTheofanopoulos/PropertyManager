from flask import Blueprint, render_template

from app.common.fake_data import dataset

leases_bp = Blueprint("leases", __name__)


@leases_bp.route("/")
def index():
    return render_template(
        "list_pages/index.html",
        page_title="Leases",
        rows=dataset()["leases"],
        columns=[
            "tenant_display",
            "tenant_count",
            "property",
            "unit",
            "start_date",
            "end_date",
            "monthly_rent",
            "status",
        ],
        column_labels={
            "tenant_display": "Leaseholders",
            "tenant_count": "People on Lease",
            "property": "Street",
            "unit": "Apartment",
            "start_date": "Start Date",
            "end_date": "End Date",
            "monthly_rent": "Monthly Rent",
            "status": "Status",
        },
        table_id="leases-table",
    )
