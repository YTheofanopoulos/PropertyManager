from flask import Flask
from .extensions import db
from config import Config

def create_app():
    app=Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    @app.get('/')
    def index(): return '<h1>Property Manager Phase 1</h1>'
    return app
