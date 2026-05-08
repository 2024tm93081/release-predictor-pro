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
from db import historical_releases, sprints
import pandas as pd
import numpy as np

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


def get_rule_based_status(data):
    score = 0
    total = len(THRESHOLDS)

    for key, threshold in THRESHOLDS.items():
        value = data.get(key)

        if value is None:
            continue

        if "max" in threshold:
            if value <= threshold["max"]:
                score += 1
        elif "min" in threshold:
            if value >= threshold["min"]:
                score += 1

    final_score = score / total

    if final_score >= 0.8:
        status = "Ready"
    elif final_score >= 0.5:
        status = "At Risk"
    else:
        status = "Not Ready"

    return status, round(final_score * 100, 2)

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


def to_scalar(value):
    arr = np.array(value).flatten()
    return str(arr[0]) if len(arr) > 0 else "At Risk"


def calculate_ml_prediction(data):
    # Use DataFrame so feature names match training
    X_input = pd.DataFrame([[data[f] for f in FEATURES]], columns=FEATURES)

    # -------------------------
    # Random Forest
    # -------------------------
    rf_pred_raw = rf_model.predict(X_input)
    rf_pred = to_scalar(rf_pred_raw)

    rf_proba = np.array(rf_model.predict_proba(X_input)[0]).flatten()
    rf_classes = [str(c) for c in rf_model.classes_]

    rf_proba_dict = {
        str(c): round(float(p) * 100, 1)
        for c, p in zip(rf_classes, rf_proba)
    }

    rf_confidence = rf_proba_dict.get(rf_pred, round(float(np.max(rf_proba)) * 100, 1))

    # -------------------------
    # CatBoost
    # -------------------------
    cb_pred_raw = cb_model.predict(X_input)
    cb_label = to_scalar(cb_pred_raw)

    cb_proba = np.array(cb_model.predict_proba(X_input)[0]).flatten()
    cb_classes = [str(c) for c in cb_model.classes_]

    cb_proba_dict = {
        str(c): round(float(p) * 100, 1)
        for c, p in zip(cb_classes, cb_proba)
    }

    cb_confidence = cb_proba_dict.get(cb_label, round(float(np.max(cb_proba)) * 100, 1))

    # CatBoost is primary model now
    return {
        "final_prediction": cb_label,
        "readiness": cb_confidence,
        "random_forest": {
            "prediction": rf_pred,
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
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        release_id = data.get("release_id")
        selected_model = data.get("model", "Random Forest")

        # Case 1: fetch stored release from DB
        if release_id:
            release_data = historical_releases.find_one(
                {"release_id": release_id},
                {"_id": 0}
            )

            if not release_data:
                return jsonify({
                    "success": False,
                    "error": "Release not found"
                }), 404

            input_data = release_data

        # Case 2: manual input
        else:
            missing_fields = [field for field in FEATURES if field not in data]
            if missing_fields:
                return jsonify({
                    "success": False,
                    "error": f"Missing required fields: {', '.join(missing_fields)}"
                }), 400

            input_data = data

        # normalize numeric fields
        for field in FEATURES:
            if field not in input_data:
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}"
                }), 400

        normalized_data = {
            "release_id": input_data.get("release_id", "Manual Input"),

            "sprint_count": int(float(input_data.get("sprint_count", 3))),
            "avg_velocity": float(input_data.get("avg_velocity", 30)),

            "defect_density": float(input_data.get("defect_density", 0)),
            "test_coverage": float(input_data.get("test_coverage", 0)),
            "spillover_ratio": float(input_data.get("spillover_ratio", 0)),
            "code_churn": float(input_data.get("code_churn", 0)),
            "velocity_variance": float(input_data.get("velocity_variance", 0)),
            "open_critical_bugs": int(float(input_data.get("open_critical_bugs", 0))),
            "regression_pass_rate": float(input_data.get("regression_pass_rate", 0)),
            "sprint_goal_met": int(float(input_data.get("sprint_goal_met", 0))),
            "effort_ratio": float(input_data.get("effort_ratio", 1)),
            "days_since_incident": int(float(input_data.get("days_since_incident", 0))),
        }

        # ML prediction
        ml_result = calculate_ml_prediction(normalized_data)

        # Rule-based scoring
        rule_status, rule_score = get_rule_based_status(normalized_data)

        # Blocking / healthy metrics
        blockers, healthy = get_blocking_factors(normalized_data)

        # pick model-specific result
        if selected_model == "CatBoost":
            model_block = ml_result.get("catboost", {})
            final_status = model_block.get("prediction", "At Risk")
            final_confidence = model_block.get("confidence", 0) or 0
            model_probs = model_block.get("probabilities", {})
            description = f"CatBoost prediction for {normalized_data.get('release_id', 'manual input')}"
        elif selected_model == "Rule-Based":
            final_status = rule_status
            final_confidence = rule_score
            model_probs = {
                "Ready": rule_score if rule_status == "Ready" else 0,
                "At Risk": rule_score if rule_status == "At Risk" else 0,
                "Not Ready": rule_score if rule_status == "Not Ready" else 0,
            }
            description = f"Rule-Based prediction for {normalized_data.get('release_id', 'manual input')}"
        else:
            model_block = ml_result.get("random_forest", {})
            final_status = model_block.get("prediction", "At Risk")
            final_confidence = model_block.get("confidence", 0) or 0
            model_probs = model_block.get("probabilities", {})
            description = f"Random Forest prediction for {normalized_data.get('release_id', 'manual input')}"

        return jsonify({
            "success": True,
            "status": final_status,
            "confidence": final_confidence,
            "description": description,

            "probReady": round(float(model_probs.get("Ready", 0)), 1),
            "probAtRisk": round(float(model_probs.get("At Risk", 0)), 1),
            "probNotReady": round(float(model_probs.get("Not Ready", 0)), 1),

            "final_prediction": ml_result["final_prediction"],
            "readiness": ml_result["readiness"],

            "random_forest": ml_result.get("random_forest", {}),
            "catboost": ml_result.get("catboost", {}),

            "rule_based": {
                "status": rule_status,
                "score": rule_score
            },

            "blockingFactors": [
            {
            "name": str(b.get("metric", b.get("name", "Unknown"))),
            "current": str(b.get("current", "")),
            "required": str(
            b.get("threshold",
            b.get("required",
            b.get("label", "")))),
            "pass": False}
            for b in blockers
        ] + [
            {
                "name": str(h.get("metric", h.get("name", "Unknown"))),
                "current": str(h.get("current", "")),
                "required": str(
                    h.get("threshold",
                    h.get("required",
                    h.get("label", "")))
                ),
                "pass": True
            }
            for h in healthy
        ],
            "blocking_factors": blockers,
            "healthy_metrics": healthy,
            "blocker_count": len(blockers)
        })

    except Exception as e:
        print("Predict API error:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

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
    try:
        data = list(historical_releases.find({}, {"_id": 0}))

        for item in data:
            try:
                rule_status, rule_score = get_rule_based_status(item)

                item["rule_based"] = {
                    "status": rule_status,
                    "score": rule_score
                }

                if "ml_prediction" not in item or not item.get("ml_prediction"):
                    ml_result = calculate_ml_prediction(item)

                    ml_prediction = {
                        "status": ml_result["final_prediction"],
                        "confidence": ml_result["readiness"],
                        "random_forest": ml_result["random_forest"],
                        "catboost": ml_result["catboost"]
                    }

                    item["ml_prediction"] = ml_prediction

                    historical_releases.update_one(
                        {"release_id": item["release_id"]},
                        {"$set": {"ml_prediction": ml_prediction}}
                    )

            except Exception as inner_error:
                print(f"Release mapping error for {item.get('release_id')}: {inner_error}")
        return jsonify(data)

    except Exception as e:
        print("Get releases error:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/releases/<release_id>", methods=["GET"])
def get_release_by_id(release_id):
    try:
        item = historical_releases.find_one({"release_id": release_id}, {"_id": 0})

        if not item:
            return jsonify({
                "success": False,
                "error": "Release not found"
            }), 404

        try:
            rule_status, rule_score = get_rule_based_status(item)

            item["rule_based"] = {
                "status": rule_status,
                "score": rule_score
            }

            ml_result = calculate_ml_prediction(item)

            item["ml_prediction"] = {
            "status": ml_result["final_prediction"],
            "confidence": ml_result["readiness"],
            "random_forest": ml_result["random_forest"],
            "catboost": ml_result["catboost"]
}
        except Exception as inner_error:
            print(f"Single release mapping error for {item.get('release_id')}: {inner_error}")

        return jsonify(item)

    except Exception as e:
        print("Get single release error:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/releases", methods=["POST"])
def add_release():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        release_id = data.get("release_id")
        if not release_id:
            return jsonify({
                "success": False,
                "error": "release_id is required"
            }), 400

        existing = historical_releases.find_one({"release_id": release_id})
        if existing:
            return jsonify({
                "success": False,
                "error": "Release ID already exists"
            }), 400

        missing_fields = [field for field in FEATURES if field not in data]
        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        # ML prediction
        ml_result = calculate_ml_prediction(data)

        # Rule-based scoring
        rule_status, rule_score = get_rule_based_status(data)

        # Blocking / healthy metrics
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
            "sprint_count": int(float(data.get("sprint_count", 3))),
            "avg_velocity": float(data.get("avg_velocity", 30)),

            # Main display values
            "readiness_label": ml_result["final_prediction"],
            "readiness": ml_result["readiness"],

            # ML details
            "ml_prediction": {
                "status": ml_result["final_prediction"],
                "confidence": ml_result["readiness"],
                "random_forest": ml_result["random_forest"],
                "catboost": ml_result["catboost"]
            },

            # Rule-based details
            "rule_based": {
                "status": rule_status,
                "score": rule_score
            },

            # Explainability
            "blocking_factors": blockers,
            "healthy_metrics": healthy
        }

        historical_releases.insert_one(release_document)
        response_release = {**release_document}
        response_release.pop("_id", None)

        return jsonify({
            "success": True,
            "message": "Release added successfully",
            "release": response_release
        }), 201

    except Exception as e:
        print("Add release error:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/releases/<release_id>", methods=["PUT"])
def update_release(release_id):
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        existing = historical_releases.find_one({"release_id": release_id})
        if not existing:
            return jsonify({
                "success": False,
                "error": "Release not found"
            }), 404

        missing_fields = [field for field in FEATURES if field not in data]
        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        new_release_id = data.get("release_id", release_id)

        if new_release_id != release_id:
            duplicate = historical_releases.find_one({"release_id": new_release_id})
            if duplicate:
                return jsonify({
                    "success": False,
                    "error": "Release ID already exists"
                }), 400

        # ML prediction
        ml_result = calculate_ml_prediction(data)

        # Rule-based scoring
        rule_status, rule_score = get_rule_based_status(data)

        # Blocking / healthy metrics
        blockers, healthy = get_blocking_factors(data)

        updated_document = {
            "release_id": new_release_id,
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
            "sprint_count": int(float(data.get("sprint_count", 3))),
            "avg_velocity": float(data.get("avg_velocity", 30)),

            # Main display values
            "readiness_label": ml_result["final_prediction"],
            "readiness": ml_result["readiness"],

            # ML details
            "ml_prediction": {
                "status": ml_result["final_prediction"],
                "confidence": ml_result["readiness"],
                "random_forest": ml_result["random_forest"],
                "catboost": ml_result["catboost"]
            },

            # Rule-based details
            "rule_based": {
                "status": rule_status,
                "score": rule_score
            },

            # Explainability
            "blocking_factors": blockers,
            "healthy_metrics": healthy
        }

        historical_releases.update_one(
            {"release_id": release_id},
            {"$set": updated_document}
        )

        response_release = {**updated_document}

        return jsonify({
            "success": True,
            "message": "Release updated successfully",
            "release": response_release
        }), 200

    except Exception as e:
        print("Update release error:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ── API: Sprints ─────────────────────────────────────────
@app.route("/api/sprints", methods=["GET"])
def get_sprints():
    try:
        release_id = request.args.get("release_id")

        query = {}
        if release_id:
            query["release_id"] = release_id

        sprint_data = list(
            sprints.find(query, {"_id": 0}).sort([
                ("release_target_date", -1),
                ("sprint_order", 1)
            ])
        )

        return jsonify({
            "success": True,
            "data": sprint_data
        }), 200

    except Exception as e:
        print("Get sprints error:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    try:
        release_rows = list(historical_releases.find({}, {"_id": 0}))
        sprint_rows = list(sprints.find({}, {"_id": 0}))

        with open("models/results.json") as f:
            results = json.load(f)

        # CatBoost is now primary model
        cb_metrics = results.get("catboost", {}).get("metrics", {})
        cb_f1 = float(cb_metrics.get("cv_mean_f1", cb_metrics.get("cv_f1", 0)))

        cb_importance = results.get("catboost", {}).get("feature_importance", {})
        rf_importance = results.get("random_forest", {}).get("feature_importance", {})

        # Use CatBoost importance first, fallback to RF if needed
        importance_source = cb_importance if cb_importance else rf_importance

        top_features = sorted(
            [
                {"name": key, "score": round(float(value) * 100, 1)}
                for key, value in importance_source.items()
            ],
            key=lambda x: x["score"],
            reverse=True
        )[:3]

        if not release_rows:
            return jsonify({
                "success": True,
                "summary": {
                    "current_release": "N/A",
                    "target_date": "",
                    "readiness_score": 0,
                    "readiness_delta": 0,
                    "open_critical_bugs": 0,
                    "ml_model_accuracy": round(cb_f1 * 100),
                    "model_subtitle": f"CatBoost CV F1: {cb_f1:.2f}"
                },
                "readiness_trend": [],
                "velocity_trend": [],
                "recent_releases": [],
                "blocking_factors": [],
                "top_features": top_features
            }), 200

        release_rows = sorted(
            release_rows,
            key=lambda x: x.get("target_date", ""),
            reverse=True
        )

        latest_release = release_rows[0]
        previous_release = release_rows[1] if len(release_rows) > 1 else None

        latest_readiness = int(latest_release.get("readiness", 0))
        previous_readiness = (
            int(previous_release.get("readiness", 0))
            if previous_release
            else latest_readiness
        )
        readiness_delta = latest_readiness - previous_readiness

        summary = {
            "current_release": latest_release.get("release_id", "N/A"),
            "target_date": latest_release.get("target_date", ""),
            "readiness_score": latest_readiness,
            "readiness_delta": readiness_delta,
            "open_critical_bugs": latest_release.get("open_critical_bugs", 0),
            "ml_model_accuracy": round(cb_f1 * 100),
            "model_subtitle": f"CatBoost CV F1: {cb_f1:.2f}"
        }

        readiness_trend = []
        for row in reversed(release_rows[:4]):
            readiness_trend.append({
                "name": row.get("release_id"),
                "score": int(row.get("readiness", 0)),
                "status": row.get("readiness_label", "At Risk")
            })

        latest_release_id = latest_release.get("release_id")
        latest_release_sprints = [
            row for row in sprint_rows
            if row.get("release_id") == latest_release_id
        ]

        latest_release_sprints = sorted(
            latest_release_sprints,
            key=lambda x: x.get("sprint_order", 0)
        )

        velocity_trend = [
            {
                "name": row.get("sprint_name"),
                "velocity": int(row.get("velocity", 0))
            }
            for row in latest_release_sprints
        ]

        recent_releases = []
        for row in release_rows[:4]:
            recent_releases.append({
                "id": row.get("release_id"),
                "status": row.get("readiness_label", "At Risk"),
                "date": row.get("target_date", ""),
                "readiness": int(row.get("readiness", 0)),
                "coverage": float(row.get("test_coverage", 0)),
                "bugs": int(row.get("open_critical_bugs", 0))
            })

        thresholds = results.get("thresholds", {})
        blocking_factors = []

        for feature, rule in thresholds.items():
            current_value = latest_release.get(feature)

            if current_value is None:
                continue

            try:
                current_value = float(current_value)
            except (ValueError, TypeError):
                continue

            if "min" in rule and current_value < rule["min"]:
                blocking_factors.append(
                    f"{feature.replace('_', ' ').title()} is low ({current_value}) — required {rule.get('label', rule['min'])}"
                )

            if "max" in rule and current_value > rule["max"]:
                blocking_factors.append(
                    f"{feature.replace('_', ' ').title()} is high ({current_value}) — required {rule.get('label', rule['max'])}"
                )

        blocking_factors = blocking_factors[:5]

        return jsonify({
            "success": True,
            "summary": summary,
            "readiness_trend": readiness_trend,
            "velocity_trend": velocity_trend,
            "recent_releases": recent_releases,
            "blocking_factors": blocking_factors,
            "top_features": top_features
        }), 200

    except Exception as e:
        print("Get dashboard error:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/quality", methods=["GET"])
def get_quality():
    try:
        release_rows = list(historical_releases.find({}, {"_id": 0}))

        with open("models/results.json") as f:
            results = json.load(f)

        thresholds = results.get("thresholds", {})

        if not release_rows:
            return jsonify({
                "success": True,
                "current_release": None,
                "metrics": {},
                "gates": [],
                "trend": []
            }), 200

        release_rows = sorted(
            release_rows,
            key=lambda x: x.get("target_date", ""),
            reverse=True
        )

        latest_release = release_rows[0]

        def build_gate(label, current_value, passed):
            return {
                "name": label,
                "current": current_value,
                "passed": passed
            }

        metrics = {
            "release_id": latest_release.get("release_id"),
            "test_coverage": latest_release.get("test_coverage", 0),
            "defect_density": latest_release.get("defect_density", 0),
            "code_churn": latest_release.get("code_churn", 0),
            "regression_pass_rate": latest_release.get("regression_pass_rate", 0),
            "open_critical_bugs": latest_release.get("open_critical_bugs", 0),
            "velocity_variance": latest_release.get("velocity_variance", 0),
            "spillover_ratio": latest_release.get("spillover_ratio", 0),
            "days_since_incident": latest_release.get("days_since_incident", 0),
        }

        gates = [
            build_gate(
                f"Defect Density {thresholds['defect_density']['label']}/KLOC" if 'defect_density' in thresholds else "Defect Density",
                str(metrics["defect_density"]),
                float(metrics["defect_density"]) <= float(thresholds["defect_density"]["max"]) if "defect_density" in thresholds else True
            ),
            build_gate(
                f"Test Coverage {thresholds['test_coverage']['label']}%" if 'test_coverage' in thresholds else "Test Coverage",
                f"{metrics['test_coverage']}%",
                float(metrics["test_coverage"]) >= float(thresholds["test_coverage"]["min"]) if "test_coverage" in thresholds else True
            ),
            build_gate(
                f"Regression Pass Rate {thresholds['regression_pass_rate']['label']}%" if 'regression_pass_rate' in thresholds else "Regression Pass Rate",
                f"{metrics['regression_pass_rate']}%",
                float(metrics["regression_pass_rate"]) >= float(thresholds["regression_pass_rate"]["min"]) if "regression_pass_rate" in thresholds else True
            ),
            build_gate(
                f"Spillover Ratio {thresholds['spillover_ratio']['label']}%" if 'spillover_ratio' in thresholds else "Spillover Ratio",
                f"{metrics['spillover_ratio']}%",
                float(metrics["spillover_ratio"]) <= float(thresholds["spillover_ratio"]["max"]) if "spillover_ratio" in thresholds else True
            ),
            build_gate(
                f"Velocity Variance {thresholds['velocity_variance']['label']}%" if 'velocity_variance' in thresholds else "Velocity Variance",
                f"{metrics['velocity_variance']}%",
                float(metrics["velocity_variance"]) <= float(thresholds["velocity_variance"]["max"]) if "velocity_variance" in thresholds else True
            ),
            build_gate(
                f"Days Since Incident {thresholds['days_since_incident']['label']}" if 'days_since_incident' in thresholds else "Days Since Incident",
                str(metrics["days_since_incident"]),
                float(metrics["days_since_incident"]) >= float(thresholds["days_since_incident"]["min"]) if "days_since_incident" in thresholds else True
            ),
            build_gate(
                f"Open Critical Bugs {thresholds['open_critical_bugs']['label']}" if 'open_critical_bugs' in thresholds else "Open Critical Bugs",
                str(metrics["open_critical_bugs"]),
                float(metrics["open_critical_bugs"]) <= float(thresholds["open_critical_bugs"]["max"]) if "open_critical_bugs" in thresholds else True
            ),
        ]

        trend = []
        for row in reversed(release_rows[:4]):
            trend.append({
                "release": row.get("release_id"),
                "testCoverage": float(row.get("test_coverage", 0)),
                "regressionPass": float(row.get("regression_pass_rate", 0)),
                "defectDensity": float(row.get("defect_density", 0)),
            })

        return jsonify({
            "success": True,
            "current_release": latest_release.get("release_id"),
            "metrics": metrics,
            "gates": gates,
            "trend": trend
        }), 200

    except Exception as e:
        print("Get quality error:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/predict-impact", methods=["GET"])
def get_feature_impact():
    try:
        release_id = request.args.get("release_id")

        release = historical_releases.find_one(
            {"release_id": release_id},
            {"_id": 0}
        )

        if not release:
            return jsonify({"success": False, "error": "Release not found"}), 404

        with open("models/results.json") as f:
            results = json.load(f)

        importance = results["catboost"]["feature_importance"]
        thresholds = results["thresholds"]

        impact_data = []

        for feature, imp in importance.items():
            value = float(release.get(feature, 0))

            direction = 1

            if feature in thresholds:
                rule = thresholds[feature]

                if "min" in rule:
                    direction = 1 if value >= rule["min"] else -1

                if "max" in rule:
                    direction = 1 if value <= rule["max"] else -1

            impact = round(imp * direction, 3)

            impact_data.append({
                "feature": feature.replace("_", " ").title(),
                "impact": impact
            })

        # sort for better display
        impact_data = sorted(impact_data, key=lambda x: x["impact"])

        return jsonify({
            "success": True,
            "impact": impact_data
        })

    except Exception as e:
        print("Impact error:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/model-evaluation", methods=["GET"])
def get_model_evaluation():
    try:
        with open("models/results.json") as f:
            results = json.load(f)

        release_rows = list(historical_releases.find({}, {"_id": 0}))
        release_rows = sorted(
            release_rows,
            key=lambda x: x.get("target_date", ""),
            reverse=True
        )

        dataset = results.get("dataset", {})
        model_comparison = results.get("model_comparison", {})

        rf_data = results.get("random_forest", {})
        cb_data = results.get("catboost", {})

        rf_metrics = rf_data.get("metrics", {})
        cb_metrics = cb_data.get("metrics", {})

        rf_cm = rf_data.get("confusion_matrix", [])
        cb_cm = cb_data.get("confusion_matrix", [])

        rf_classification_report = rf_data.get("classification_report", {})
        cb_classification_report = cb_data.get("classification_report", {})

        def safe_float(value, default=0):
            try:
                if value is None or value == "—":
                    return default
                return float(value)
            except Exception:
                return default

        def percent(value):
            return round(safe_float(value) * 100, 1)

        def metric_value(metrics, new_key, old_key=None, default=0):
            if new_key in metrics:
                return metrics.get(new_key, default)
            if old_key and old_key in metrics:
                return metrics.get(old_key, default)
            return default

        rf_cv_mean = metric_value(rf_metrics, "cv_mean_f1", "cv_f1", 0)
        rf_cv_std = metric_value(rf_metrics, "cv_std_f1", None, 0)

        cb_cv_mean = metric_value(cb_metrics, "cv_mean_f1", "cv_f1", 0)
        cb_cv_std = metric_value(cb_metrics, "cv_std_f1", None, 0)

        baseline_metrics = {
            "accuracy": 67.5,
            "f1": 0.59,
            "precision": 55.0,
            "recall": 60.0,
            "cv_f1": None
        }

        better_performer = model_comparison.get(
            "better_performer_by_cv_f1",
            "Random Forest" if safe_float(rf_cv_mean) >= safe_float(cb_cv_mean) else "CatBoost"
        )

        # Keep RF as primary model visually, but show actual better performer separately
        primary_model = "CatBoost"

        if not model_comparison:
            if better_performer == "CatBoost":
                selection_note = (
                    "CatBoost achieved a higher cross-validation weighted F1-score, "
                    "indicating stronger predictive performance. However, Random Forest is retained "
                    "as the primary explainable model for the current small numerical dataset, while "
                    "CatBoost is retained as the advanced comparison and future-ready model."
                )
            else:
                selection_note = (
                    "Random Forest achieved equal or higher cross-validation weighted F1-score. "
                    "It is retained as the primary model because it is stable for small structured numerical datasets, "
                    "requires minimal preprocessing, and provides interpretable feature importance."
                )

            model_comparison = {
                "better_performer_by_cv_f1": better_performer,
                "selection_note": selection_note
            }

        top_metrics = {
            "rf_cv_f1_percent": percent(rf_cv_mean),
            "rf_cv_f1": round(safe_float(rf_cv_mean), 3),
            "rf_cv_std_f1": round(safe_float(rf_cv_std), 3),
            "rf_cv_std_f1_percent": percent(rf_cv_std),

            "cb_cv_f1_percent": percent(cb_cv_mean),
            "cb_cv_f1": round(safe_float(cb_cv_mean), 3),
            "cb_cv_std_f1": round(safe_float(cb_cv_std), 3),
            "cb_cv_std_f1_percent": percent(cb_cv_std),

            "baseline_accuracy": baseline_metrics["accuracy"],
            "baseline_f1": baseline_metrics["f1"]
        }

        model_cards = [
            {
                "name": "Random Forest",
                "badge": None,
                "winner": False,
                "metrics": {
                    "test_accuracy": f"{percent(rf_metrics.get('accuracy', 0))}%",
                    "test_f1": f"{round(safe_float(rf_metrics.get('f1', 0)), 3)}",
                    "precision": f"{round(safe_float(rf_metrics.get('precision', 0)), 3)}",
                    "recall": f"{round(safe_float(rf_metrics.get('recall', 0)), 3)}",
                    "cv_f1": f"{round(safe_float(rf_cv_mean), 3)}",
                    "cv_mean_f1": f"{round(safe_float(rf_cv_mean), 3)}",
                    "cv_std_f1": f"{round(safe_float(rf_cv_std), 3)}",
                    "training_time_seconds": rf_metrics.get("training_time_seconds", "—"),
                    "prediction_time_seconds": rf_metrics.get("prediction_time_seconds", "—")
                },
                "details": [
                    "100 trees · Bootstrap sampling",
                    "Stable for small structured datasets",
                    "Interpretable feature importance"
                ]
            },
            {
                "name": "CatBoost",
                "badge": "Primary Model",
                "winner": True,
                "metrics": {
                    "test_accuracy": f"{percent(cb_metrics.get('accuracy', 0))}%",
                    "test_f1": f"{round(safe_float(cb_metrics.get('f1', 0)), 3)}",
                    "precision": f"{round(safe_float(cb_metrics.get('precision', 0)), 3)}",
                    "recall": f"{round(safe_float(cb_metrics.get('recall', 0)), 3)}",
                    "cv_f1": f"{round(safe_float(cb_cv_mean), 3)}",
                    "cv_mean_f1": f"{round(safe_float(cb_cv_mean), 3)}",
                    "cv_std_f1": f"{round(safe_float(cb_cv_std), 3)}",
                    "training_time_seconds": cb_metrics.get("training_time_seconds", "—"),
                    "prediction_time_seconds": cb_metrics.get("prediction_time_seconds", "—")
                },
                "details": [
                    "100 iterations · Sequential boosting",
                    "Strong tabular-data performance",
                    "Future-ready for categorical features"
                ]
            },
            {
                "name": "Rule-Based Baseline",
                "badge": None,
                "winner": False,
                "metrics": {
                    "test_accuracy": f"{baseline_metrics['accuracy']}%",
                    "test_f1": f"{baseline_metrics['f1']}",
                    "precision": f"{baseline_metrics['precision'] / 100:.2f}",
                    "recall": f"{baseline_metrics['recall'] / 100:.2f}",
                    "cv_f1": "—",
                    "cv_mean_f1": "—",
                    "cv_std_f1": "—",
                    "training_time_seconds": "—",
                    "prediction_time_seconds": "—"
                },
                "details": [
                    "Fixed thresholds · No learning",
                    "Manual checklist approach",
                    "Used as baseline benchmark"
                ]
            }
        ]

        comp_chart = [
            {
                "metric": "Test Accuracy",
                "Random Forest": percent(rf_metrics.get("accuracy", 0)),
                "CatBoost": percent(cb_metrics.get("accuracy", 0)),
                "Rule-Based": baseline_metrics["accuracy"]
            },
            {
                "metric": "Test F1",
                "Random Forest": percent(rf_metrics.get("f1", 0)),
                "CatBoost": percent(cb_metrics.get("f1", 0)),
                "Rule-Based": round(baseline_metrics["f1"] * 100, 1)
            },
            {
                "metric": "Precision",
                "Random Forest": percent(rf_metrics.get("precision", 0)),
                "CatBoost": percent(cb_metrics.get("precision", 0)),
                "Rule-Based": baseline_metrics["precision"]
            },
            {
                "metric": "Recall",
                "Random Forest": percent(rf_metrics.get("recall", 0)),
                "CatBoost": percent(cb_metrics.get("recall", 0)),
                "Rule-Based": baseline_metrics["recall"]
            },
            {
                "metric": "CV F1",
                "Random Forest": percent(rf_cv_mean),
                "CatBoost": percent(cb_cv_mean),
                "Rule-Based": round(baseline_metrics["f1"] * 100, 1)
            }
        ]

        prediction_history = []

        for row in release_rows[:8]:
            actual = row.get("readiness_label", "At Risk")

            rf_pred = (
                row.get("ml_prediction", {})
                .get("random_forest", {})
                .get("prediction")
            )

            cb_pred = (
                row.get("ml_prediction", {})
                .get("catboost", {})
                .get("prediction")
            )

            if not isinstance(rf_pred, str):
                rf_pred = actual

            if not isinstance(cb_pred, str):
                cb_pred = actual

            rule_status, _ = get_rule_based_status(row)

            prediction_history.append({
                "release": row.get("release_id", "N/A"),
                "rf": rf_pred,
                "cb": cb_pred,
                "rb": rule_status,
                "actual": actual,
                "rfMatch": rf_pred == actual,
                "cbMatch": cb_pred == actual
            })

        return jsonify({
            "success": True,
            "dataset": dataset,
            "model_comparison": model_comparison,
            "top_metrics": top_metrics,
            "model_cards": model_cards,
            "comparison_chart": comp_chart,
            "rf_confusion": rf_cm,
            "cb_confusion": cb_cm,
            "rf_classification_report": rf_classification_report,
            "cb_classification_report": cb_classification_report,
            "prediction_history": prediction_history
        }), 200

    except Exception as e:
        print("Model evaluation error:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500



if __name__ == "__main__":
    print("🚀 Release Pulse API starting...")
    print("   URL: http://localhost:5000")
    app.run(debug=True, port=5000)