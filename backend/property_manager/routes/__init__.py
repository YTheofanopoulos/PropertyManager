from .buildings import blueprint as buildings_blueprint
from .locations import blueprint as locations_blueprint
from .leases import blueprint as leases_blueprint
from .system import blueprint as system_blueprint
from .units import blueprint as units_blueprint
from .tenants import blueprint as tenants_blueprint

__all__ = [
    "buildings_blueprint",
    "locations_blueprint",
    "leases_blueprint",
    "system_blueprint",
    "units_blueprint",
    "tenants_blueprint",
]
