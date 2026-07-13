from flask import Blueprint, render_template
from app.common.fake_data import dashboard_data

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/")
def index():
    return render_template("dashboard/index.html", data=dashboard_data(), page_title="Dashboard")
