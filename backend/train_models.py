import os
import json
import pickle
import warnings

import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix
from catboost import CatBoostClassifier
from dotenv import load_dotenv

warnings.filterwarnings("ignore")

# Load environment variables from .env file
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "release_pulse")

if not MONGO_URI:
    raise ValueError("MongoDB URI not found in .env file")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
historical_releases = db["historical_releases"]

print("[1] Fetching data from MongoDB...")

cursor = historical_releases.find({}, {
    "_id": 0,
    "release_id": 1,
    "test_coverage": 1,
    "defect_density": 1,
    "spillover_ratio": 1,
    "code_churn": 1,
    "velocity_variance": 1,
    "open_critical_bugs": 1,
    "regression_pass_rate": 1,
    "sprint_goal_met": 1,
    "effort_ratio": 1,
    "days_since_incident": 1,
    "readiness_label": 1
})

df = pd.DataFrame(list(cursor))

if df.empty:
    raise ValueError("No data found in MongoDB collection: historical_releases")

numeric_cols = [
    "test_coverage",
    "defect_density",
    "spillover_ratio",
    "code_churn",
    "velocity_variance",
    "open_critical_bugs",
    "regression_pass_rate",
    "sprint_goal_met",
    "effort_ratio",
    "days_since_incident",
]

for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df = df.dropna()

print(f"Loaded {len(df)} rows of data.")
print("Label distribution:", dict(df["readiness_label"].value_counts()))

FEATURES = [
    "defect_density",
    "test_coverage",
    "spillover_ratio",
    "code_churn",
    "velocity_variance",
    "open_critical_bugs",
    "regression_pass_rate",
    "sprint_goal_met",
    "effort_ratio",
    "days_since_incident"
]
TARGET = "readiness_label"


def build_dynamic_thresholds(df: pd.DataFrame, target_col: str = "readiness_label"):
    ready_df = df[df[target_col] == "Ready"].copy()

    if ready_df.empty:
        raise ValueError("No 'Ready' releases found to derive thresholds.")

    thresholds = {
        "defect_density": {
            "max": round(float(ready_df["defect_density"].quantile(0.75)), 2),
            "label": "",
            "good": "low"
        },
        "test_coverage": {
            "min": round(float(ready_df["test_coverage"].quantile(0.25)), 2),
            "label": "",
            "good": "high"
        },
        "spillover_ratio": {
            "max": round(float(ready_df["spillover_ratio"].quantile(0.75)), 2),
            "label": "",
            "good": "low"
        },
        "code_churn": {
            "max": round(float(ready_df["code_churn"].quantile(0.75)), 2),
            "label": "",
            "good": "low"
        },
        "velocity_variance": {
            "max": round(float(ready_df["velocity_variance"].quantile(0.75)), 2),
            "label": "",
            "good": "low"
        },
        "open_critical_bugs": {
            "max": round(float(ready_df["open_critical_bugs"].quantile(0.75)), 2),
            "label": "",
            "good": "low"
        },
        "regression_pass_rate": {
            "min": round(float(ready_df["regression_pass_rate"].quantile(0.25)), 2),
            "label": "",
            "good": "high"
        },
        "sprint_goal_met": {
            "min": round(float(ready_df["sprint_goal_met"].quantile(0.25)), 2),
            "label": "",
            "good": "high"
        },
        "effort_ratio": {
            "max": round(float(ready_df["effort_ratio"].quantile(0.75)), 2),
            "label": "",
            "good": "low"
        },
        "days_since_incident": {
            "min": round(float(ready_df["days_since_incident"].quantile(0.25)), 2),
            "label": "",
            "good": "high"
        }
    }

    for _, value in thresholds.items():
        if "min" in value:
            value["label"] = f">= {value['min']}"
        if "max" in value:
            value["label"] = f"<= {value['max']}"

    return thresholds


X = df[FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\n[2] Split: {len(X_train)} train | {len(X_test)} test")

print("\n[3] Training Random Forest...")
rf = RandomForestClassifier(
    n_estimators=100,
    max_depth=None,
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train, y_train)
rf_pred = rf.predict(X_test)

cv_splits = min(5, y.value_counts().min())
if cv_splits < 2:
    raise ValueError("Not enough samples per class for cross-validation.")

rf_metrics = {
    "accuracy": round(float(accuracy_score(y_test, rf_pred)), 4),
    "f1": round(float(f1_score(y_test, rf_pred, average="weighted")), 4),
    "precision": round(float(precision_score(y_test, rf_pred, average="weighted")), 4),
    "recall": round(float(recall_score(y_test, rf_pred, average="weighted")), 4),
    "cv_f1": round(float(cross_val_score(rf, X, y, cv=cv_splits, scoring="f1_weighted").mean()), 4)
}
print(f"    Accuracy: {rf_metrics['accuracy']:.2%}  F1: {rf_metrics['f1']:.4f}")

print("\n[4] Training CatBoost...")
cb = CatBoostClassifier(
    iterations=100,
    learning_rate=0.1,
    depth=6,
    random_seed=42,
    verbose=False
)
cb.fit(X_train, y_train)
cb_pred = cb.predict(X_test)

cb_metrics = {
    "accuracy": round(float(accuracy_score(y_test, cb_pred)), 4),
    "f1": round(float(f1_score(y_test, cb_pred, average="weighted")), 4),
    "precision": round(float(precision_score(y_test, cb_pred, average="weighted")), 4),
    "recall": round(float(recall_score(y_test, cb_pred, average="weighted")), 4),
    "cv_f1": round(float(cross_val_score(cb, X, y, cv=cv_splits, scoring="f1_weighted").mean()), 4)
}
print(f"    Accuracy: {cb_metrics['accuracy']:.2%}  F1: {cb_metrics['f1']:.4f}")

rf_importance = {
    k: round(float(v), 4)
    for k, v in zip(FEATURES, rf.feature_importances_)
}

raw_cb = cb.feature_importances_
norm_cb = raw_cb / raw_cb.sum()
cb_importance = {
    k: round(float(v), 4)
    for k, v in zip(FEATURES, norm_cb)
}

labels_order = ["Ready", "At Risk", "Not Ready"]
rf_cm = confusion_matrix(y_test, rf_pred, labels=labels_order).tolist()
cb_cm = confusion_matrix(y_test, cb_pred, labels=labels_order).tolist()

dynamic_thresholds = build_dynamic_thresholds(df, target_col="readiness_label")

os.makedirs("models", exist_ok=True)

print("\n[5] Saving models...")
with open("models/random_forest.pkl", "wb") as f:
    pickle.dump(rf, f)

with open("models/catboost_model.pkl", "wb") as f:
    pickle.dump(cb, f)

results = {
    "features": FEATURES,
    "labels": labels_order,
    "random_forest": {
        "metrics": rf_metrics,
        "feature_importance": rf_importance,
        "confusion_matrix": rf_cm
    },
    "catboost": {
        "metrics": cb_metrics,
        "feature_importance": cb_importance,
        "confusion_matrix": cb_cm
    },
    "thresholds": dynamic_thresholds
}

with open("models/results.json", "w") as f:
    json.dump(results, f, indent=2)

print("    ✅ models/random_forest.pkl")
print("    ✅ models/catboost_model.pkl")
print("    ✅ models/results.json")

print("\n" + "=" * 55)
winner = "Random Forest" if rf_metrics["f1"] >= cb_metrics["f1"] else "CatBoost"
print(f"  Random Forest F1 : {rf_metrics['f1']:.4f}")
print(f"  CatBoost F1      : {cb_metrics['f1']:.4f}")
print(f"  Winner           : {winner} ✅")
print("=" * 55)