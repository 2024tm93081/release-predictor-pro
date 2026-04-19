import os
import json
import pickle
import warnings
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier  # <-- Added import
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix
from catboost import CatBoostClassifier
from dotenv import load_dotenv  # Import dotenv to load environment variables

# Load environment variables from .env file
load_dotenv()

# Fetch MONGO_URI from .env file
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("MongoDB URI not found in .env file")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client.get_database("release_pulse")
historical_releases = db.get_collection("historical_releases")

# Load historical data from MongoDB
print("[1] Fetching data from MongoDB...")

# Select only relevant fields and drop missing ones
cursor = historical_releases.find({}, {
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

# Ensure all data is in correct format (numeric conversion)
df = df.dropna()
for col in ["test_coverage", "defect_density", "spillover_ratio", "code_churn", "velocity_variance", 
            "open_critical_bugs", "regression_pass_rate", "sprint_goal_met", "effort_ratio", "days_since_incident"]:
    df[col] = pd.to_numeric(df[col], errors="coerce")
df = df.dropna()

print(f"Loaded {len(df)} rows of data.")

FEATURES = [
    "defect_density", "test_coverage", "spillover_ratio", "code_churn",
    "velocity_variance", "open_critical_bugs", "regression_pass_rate", "sprint_goal_met",
    "effort_ratio", "days_since_incident"
]
TARGET = "readiness_label"

required_cols = FEATURES + [TARGET]
missing_cols = [col for col in required_cols if col not in df.columns]
if missing_cols:
    raise ValueError(f"Missing required columns: {missing_cols}")

df = df[required_cols].copy()
df = df.dropna()

# Define Features and Target
X = df[FEATURES]
y = df[TARGET]

# ── Train/Test Split ──────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
print(f"\n[2] Split: {len(X_train)} train | {len(X_test)} test")

# ── Train Random Forest ───────────────────────────────────
print("\n[3] Training Random Forest...")
rf = RandomForestClassifier(
    n_estimators=100,
    max_depth=None,
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train, y_train)
rf_pred = rf.predict(X_test)

rf_metrics = {
    "accuracy": round(float(accuracy_score(y_test, rf_pred)), 4),
    "f1": round(float(f1_score(y_test, rf_pred, average="weighted")), 4),
    "precision": round(float(precision_score(y_test, rf_pred, average="weighted")), 4),
    "recall": round(float(recall_score(y_test, rf_pred, average="weighted")), 4),
    "cv_f1": round(float(cross_val_score(rf, X, y, cv=5, scoring="f1_weighted").mean()), 4)
}
print(f"    Accuracy: {rf_metrics['accuracy']:.2%}  F1: {rf_metrics['f1']:.4f}")

# ── Train CatBoost ───────────────────────────────────────
print(f"\n[4] Training CatBoost...")

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
    "cv_f1": round(float(cross_val_score(cb, X, y, cv=5, scoring="f1_weighted").mean()), 4)
}
print(f"    Accuracy: {cb_metrics['accuracy']:.2%}  F1: {cb_metrics['f1']:.4f}")

# ── Feature Importance ────────────────────────────────────
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

# ── Confusion Matrices ────────────────────────────────────
labels_order = ["Ready", "At Risk", "Not Ready"]
rf_cm = confusion_matrix(y_test, rf_pred, labels=labels_order).tolist()
cb_cm = confusion_matrix(y_test, cb_pred, labels=labels_order).tolist()

# ── Save Models ───────────────────────────────────────────
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