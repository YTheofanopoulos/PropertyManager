from flask import Flask

from .dashboard.routes import dashboard_bp
from .properties.routes import properties_bp
from .units.routes import units_bp
from .tenants.routes import tenants_bp
from .leases.routes import leases_bp
from .payments.routes import payments_bp
from .maintenance.routes import maintenance_bp
from .reports.routes import reports_bp


def create_app():
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY="dev-only-change-me",
        APP_NAME="Property Manager",
    )

    app.register_blueprint(dashboard_bp)
    app.register_blueprint(properties_bp, url_prefix="/properties")
    app.register_blueprint(units_bp, url_prefix="/units")
    app.register_blueprint(tenants_bp, url_prefix="/tenants")
    app.register_blueprint(leases_bp, url_prefix="/leases")
    app.register_blueprint(payments_bp, url_prefix="/payments")
    app.register_blueprint(maintenance_bp, url_prefix="/maintenance")
    app.register_blueprint(reports_bp, url_prefix="/reports")

    return app
