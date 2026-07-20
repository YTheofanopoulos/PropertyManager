from __future__ import annotations

import logging
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from .config import PROJECT_DIR, Settings
from .database import initialize_pool
from .routes import system_blueprint, units_blueprint


def create_app() -> Flask:
    settings = Settings.from_environment()
    logging.basicConfig(
        level=getattr(logging, settings.log_level, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    initialize_pool(settings)

    dist_dir = PROJECT_DIR / "frontend" / "dist"
    app = Flask(__name__, static_folder=str(dist_dir), static_url_path="")
    app.config["PM_SETTINGS"] = settings
    app.register_blueprint(system_blueprint)
    app.register_blueprint(units_blueprint)

    @app.get("/api/v1")
    def api_root():
        return jsonify({"name": "PropertyManager API", "version": "v1"})

    @app.get("/")
    def index():
        return send_from_directory(dist_dir, "index.html")

    @app.get("/<path:path>")
    def assets_or_spa(path: str):
        if path.startswith("api/"):
            return jsonify({"error": "Not found"}), 404
        requested = dist_dir / path
        if requested.is_file():
            return send_from_directory(dist_dir, path)
        return send_from_directory(dist_dir, "index.html")

    return app
