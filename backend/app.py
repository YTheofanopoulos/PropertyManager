from pathlib import Path
from flask import Flask, send_from_directory

DIST_DIR = Path(__file__).resolve().parents[1] / "frontend" / "dist"
app = Flask(__name__, static_folder=str(DIST_DIR), static_url_path="")

@app.get("/")
def index():
    return send_from_directory(DIST_DIR, "index.html")

@app.get("/<path:path>")
def assets_or_spa(path: str):
    requested = DIST_DIR / path
    if requested.is_file():
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")

if __name__ == "__main__":
    app.run(debug=True)
