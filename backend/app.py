from property_manager.app_factory import create_app

app = create_app()

if __name__ == "__main__":
    settings = app.config["PM_SETTINGS"]
    app.run(host="127.0.0.1", port=5000, debug=settings.flask_debug)
