import os

from flask import Flask, jsonify


app = Flask(__name__)


@app.route("/")
def home():
    environment = os.getenv("APP_ENVIRONMENT", "local")

    return jsonify(
        {
            "message": "Azure Secure Container Platform",
            "environment": environment,
            "status": "running",
        }
    )


@app.route("/health")
def health():
    return jsonify({"status": "healthy"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8077)

