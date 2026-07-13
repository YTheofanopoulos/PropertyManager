from flask import Blueprint, render_template

from app.common.fake_data import dataset

tenants_bp = Blueprint("tenants", __name__)


@tenants_bp.route("/")
def index():
    return render_template(
        "list_pages/index.html",
        page_title="Tenants",
        rows=dataset()["tenants"],
        columns=[
            "name",
            "property",
            "unit",
            "primary_tenant",
            "phone",
            "email",
            "balance",
            "status",
        ],
        column_labels={
            "name": "Tenant",
            "property": "Street",
            "unit": "Apartment",
            "primary_tenant": "Primary",
            "phone": "Phone",
            "email": "Email",
            "balance": "Balance",
            "status": "Status",
        },
        table_id="tenants-table",
    )
