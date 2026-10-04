#This V2 app ensures that the key vault is able to be read 
#Ingestion from API keys or Secrets is possible and proven with this build 


from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route("/")
def home():
    environment = os.getenv("APP_ENVIRONMENT", "local")
    app_message = os.getenv("APP_MESSAGE", "No Key Vault message loaded")

    return jsonify({
        "message": "Azure Secure Container Platform",
        "environment": environment,
        "app_message": app_message,
        "status": "running"
    })

@app.route("/health")
def health():
    return jsonify({
        "status": "healthy"
    }), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8077)
