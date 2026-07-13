from flask import Blueprint, render_template

reports_bp = Blueprint("reports", __name__)

@reports_bp.route("/")
def index():
    reports = [
        ("Rent Roll", "Current rent, occupancy, and lease summary"),
        ("Delinquency", "Outstanding balances grouped by tenant"),
        ("Lease Expirations", "Upcoming lease end dates"),
        ("Maintenance Cost", "Work order and vendor spending summary"),
    ]
    return render_template("reports.html", page_title="Reports", reports=reports)
