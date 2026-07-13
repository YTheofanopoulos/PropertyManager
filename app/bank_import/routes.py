from flask import Blueprint, flash, redirect, render_template, request, url_for

bank_import_bp = Blueprint("bank_import", __name__)


@bank_import_bp.route("/", methods=["GET", "POST"])
def index():
    preview = []

    if request.method == "POST":
        statement = request.files.get("statement")

        if not statement or not statement.filename:
            flash("Select a bank statement file to import.", "warning")
            return redirect(url_for("bank_import.index"))

        preview = [
            {
                "date": "2026-07-01",
                "description": "E-TRANSFER MARIE TREMBLAY",
                "amount": 1250.00,
                "match": "383 2 — Marie Tremblay",
                "confidence": "High",
            },
            {
                "date": "2026-07-02",
                "description": "E-TRANSFER JEAN LAVOIE",
                "amount": 1100.00,
                "match": "5213 A — Jean Lavoie",
                "confidence": "High",
            },
            {
                "date": "2026-07-03",
                "description": "INTERAC PAYMENT 8742",
                "amount": 975.00,
                "match": "Unmatched",
                "confidence": "Review",
            },
        ]
        flash(
            f"{statement.filename} was loaded for preview. "
            "No payments have been posted.",
            "info",
        )

    return render_template(
        "bank_import/index.html",
        page_title="Import Bank Statement",
        preview=preview,
    )
