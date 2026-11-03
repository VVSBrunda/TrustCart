"""Trust Cart ML microservice. POST raw image bytes to /analyze."""
import os

from flask import Flask, jsonify, request

from analyzer import analyze, MODEL_NAME

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024


@app.get("/health")
def health():
    return jsonify(status="ok", model=MODEL_NAME)


@app.post("/analyze")
def analyze_route():
    data = request.get_data()
    if not data:
        return jsonify(error="empty body"), 400
    try:
        return jsonify(analyze(data))
    except Exception as exc:  # unreadable / unsupported image
        return jsonify(error=f"could not analyse image: {exc}"), 422


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("ML_PORT", 5001)))
