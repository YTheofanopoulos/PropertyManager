from flask import Flask, render_template
from .common.fake_data import dashboard

def create_app():
    app=Flask(__name__)
    @app.route("/")
    def home():
        return render_template("dashboard.html", data=dashboard())
    return app
