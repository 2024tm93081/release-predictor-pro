"""
Release Pulse - Flask Backend API
Run: python app.py
API runs on: http://localhost:5000
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import json
import os
from db import historical_releases

app = Flask(__name__)
CORS(app)

# ── Load Models & Results ────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

try:
    with open(os.path.join(MODELS_DIR, "random_forest.pkl"), "rb") as f:
        rf_model = pickle.load(f)
    with open(os.path.join(MODELS_DIR, "catboost_model.pkl"), "rb") as f:
        cb_model = pickle.load(f)
    with open(os.path.join(MODELS_DIR, "results.json"), "r") as f:
        results = json.load(f)
    print("✅ Models loaded successfully!")
except Exception as e:
    print(f"❌ Failed to load models: {e}")
    raise

FEATURES = results["features"]
THRESHOLDS = results["thresholds"]


# ── Helper: Blocking Factors ─────────────────────────────
def get_blocking_factors(data):
    blockers = []
    healthy = []

    checks = [
        ("defect_density", "Defect Density", "max", "bugs/KLOC"),
        ("test_coverage", "Test Coverage", "min", "%"),
        ("spillover_ratio", "Spillover Ratio", "max", "%"),
        ("code_churn", "Code Churn", "max", "%"),
        ("velocity_variance", "Velocity Variance", "max", "%"),
        ("open_critical_bugs", "Open Critical Bugs", "max", "bugs"),
        ("regression_pass_rate", "Regression Pass Rate", "min", "%"),
        ("sprint_goal_met", "Sprint Goals Met", "min", "/ 3"),
        ("effort_ratio", "Effort Ratio", "max", "x planned"),
        ("days_since_incident", "Days Since Incident", "min", "days"),
    ]

    for key, label, direction, unit in checks:
        value = data[key]
        threshold = THRESHOLDS[key]

        if direction == "max":
            limit = threshold["max"]
            is_blocking = value > limit
        else:
            limit = threshold["min"]
            is_blocking = value < limit

        item = {
            "metric": label,
            "key": key,
            "current": value,
            "required": threshold["label"],
            "unit": unit
        }

        if is_blocking:
            blockers.append(item)
        else:
            healthy.append(item)

    return blockers, healthy


# ── Helper: Rule-Based Logic ─────────────────────────────
def calculate_rule_based(data):
    score = 0

    if data["defect_density"] < 3.5:
        score += 2
    if data["test_coverage"] > 75:
        score += 2
    if data["spillover_ratio"] < 15:
        score += 2
    if data["open_critical_bugs"] <= 1:
        score += 3
    if data["regression_pass_rate"] > 85:
        score += 2
    if data["effort_ratio"] < 1.2:
        score += 1

    if score >= 9:
        rule_pred = "Ready"
        rule_readiness = 85
    elif score >= 5:
        rule_pred = "At Risk"
        rule_readiness = 65
    else:
        rule_pred = "Not Ready"
        rule_readiness = 35

    return {
        "prediction": rule_pred,
        "score": score,
        "readiness": rule_readiness
    }


# ── Helper: ML Prediction ────────────────────────────────
def calculate_ml_prediction(data):
    features = [[data[f] for f in FEATURES]]

    # Random Forest
    rf_pred = rf_model.predict(features)[0]
    rf_proba = rf_model.predict_proba(features)[0]
    rf_classes = rf_model.classes_
    rf_confidence = round(float(max(rf_proba)) * 100, 1)
    rf_proba_dict = {
        str(c): round(float(p) * 100, 1)
        for c, p in zip(rf_classes, rf_proba)
    }

    # CatBoost / fallback model
    cb_pred = cb_model.predict(features)
    cb_label = cb_pred[0] if isinstance(cb_pred[0], str) else str(cb_pred[0])

    cb_confidence = None
    cb_proba_dict = {}

    if hasattr(cb_model, "predict_proba"):
        cb_proba = cb_model.predict_proba(features)[0]
        cb_classes = cb_model.classes_
        cb_confidence = round(float(max(cb_proba)) * 100, 1)
        cb_proba_dict = {
            str(c): round(float(p) * 100, 1)
            for c, p in zip(cb_classes, cb_proba)
        }

    return {
        "final_prediction": str(rf_pred),
        "readiness": rf_confidence,
        "random_forest": {
            "prediction": str(rf_pred),
            "confidence": rf_confidence,
            "probabilities": rf_proba_dict
        },
        "catboost": {
            "prediction": cb_label,
            "confidence": cb_confidence,
            "probabilities": cb_proba_dict
        }
    }


# ── API: Health Check ────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Release Pulse API running!"})


# ── API: Predict ─────────────────────────────────────────
@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        missing_fields = [field for field in FEATURES if field not in data]
        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        ml_result = calculate_ml_prediction(data)
        rule_result = calculate_rule_based(data)
        blockers, healthy = get_blocking_factors(data)

        return jsonify({
            "success": True,
            "final_prediction": ml_result["final_prediction"],
            "readiness": ml_result["readiness"],
            "random_forest": ml_result["random_forest"],
            "catboost": ml_result["catboost"],
            "rule_based": rule_result,
            "blocking_factors": blockers,
            "healthy_metrics": healthy,
            "blocker_count": len(blockers)
        })

    except Exception as e:
        print("Predict API error:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


# ── API: Model Comparison ────────────────────────────────
@app.route("/api/comparison", methods=["GET"])
def comparison():
    return jsonify({
        "success": True,
        "model2_name": results.get("model2_name", "CatBoost"),
        "random_forest": results["random_forest"],
        "catboost": results["catboost"],
        "labels": results["labels"]
    })


# ── API: Feature Importance ──────────────────────────────
@app.route("/api/features", methods=["GET"])
def features():
    return jsonify({
        "success": True,
        "random_forest": results["random_forest"]["feature_importance"],
        "catboost": results["catboost"]["feature_importance"],
        "feature_names": FEATURES
    })


# ── API: Releases ────────────────────────────────────────
@app.route("/api/releases", methods=["GET"])
def get_releases():
    data = list(historical_releases.find({}, {"_id": 0}))
    return jsonify(data)


@app.route("/api/releases", methods=["POST"])
def add_release():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        release_id = data.get("release_id")
        if not release_id:
            return jsonify({"success": False, "error": "release_id is required"}), 400

        existing = historical_releases.find_one({"release_id": release_id})
        if existing:
            return jsonify({"success": False, "error": "Release ID already exists"}), 400

        missing_fields = [field for field in FEATURES if field not in data]
        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        ml_result = calculate_ml_prediction(data)
        rule_result = calculate_rule_based(data)
        blockers, healthy = get_blocking_factors(data)

        release_document = {
            "release_id": data["release_id"],
            "target_date": data.get("target_date"),
            "test_coverage": data["test_coverage"],
            "defect_density": data["defect_density"],
            "spillover_ratio": data["spillover_ratio"],
            "code_churn": data["code_churn"],
            "open_critical_bugs": data["open_critical_bugs"],
            "regression_pass_rate": data["regression_pass_rate"],
            "sprint_goal_met": data["sprint_goal_met"],
            "velocity_variance": data["velocity_variance"],
            "effort_ratio": data["effort_ratio"],
            "days_since_incident": data["days_since_incident"],

            # Main display values
            "readiness_label": ml_result["final_prediction"],
            "readiness": ml_result["readiness"],

            # Detailed outputs
            "ml_prediction": {
                "status": ml_result["final_prediction"],
                "confidence": ml_result["readiness"],
                "random_forest": ml_result["random_forest"],
                "catboost": ml_result["catboost"]
            },
            "rule_based": {
                "status": rule_result["prediction"],
                "score": rule_result["score"],
                "readiness": rule_result["readiness"]
            },
            "blocking_factors": blockers,
            "healthy_metrics": healthy
        }

        historical_releases.insert_one(release_document)

        return jsonify({
            "success": True,
            "message": "Release added successfully",
            "release": release_document
        }), 201

    except Exception as e:
        print("Add release error:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


# ── API: Sprints ─────────────────────────────────────────
@app.route("/api/sprints", methods=["GET"])
def sprints():
    sprints_data = [
        {"name": "Sprint 24", "velocity": 84, "planned": 90,
         "completed": 84, "spillover": 8, "goal_met": "3/3", "status": "Healthy"},
        {"name": "Sprint 23", "velocity": 71, "planned": 85,
         "completed": 71, "spillover": 18, "goal_met": "2/3", "status": "Warning"},
        {"name": "Sprint 22", "velocity": 90, "planned": 88,
         "completed": 90, "spillover": 4, "goal_met": "3/3", "status": "Healthy"},
        {"name": "Sprint 21", "velocity": 65, "planned": 78,
         "completed": 65, "spillover": 22, "goal_met": "1/3", "status": "Critical"},
    ]
    return jsonify({"success": True, "sprints": sprints_data})


if __name__ == "__main__":
    print("🚀 Release Pulse API starting...")
    print("   URL: http://localhost:5000")
    app.run(debug=True, port=5000)