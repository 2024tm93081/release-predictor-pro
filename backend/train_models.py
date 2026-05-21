import os
import json
import pickle
import warnings
import time

import pandas as pd
import numpy as np
from pymongo import MongoClient
from dotenv import load_dotenv

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    confusion_matrix,
    classification_report
)

from catboost import CatBoostClassifier

warnings.filterwarnings("ignore")

# ==========================================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================================

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "release_pulse")

if not MONGO_URI:
    raise ValueError("MongoDB URI not found in .env file")

# ==========================================================
# CONNECT TO MONGODB
# ==========================================================

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
historical_releases = db["historical_releases"]

print("[1] Fetching data from MongoDB...")

cursor = historical_releases.find({}, {
    "_id": 0,
    "release_id": 1,

    # Sprint / delivery features
    "sprint_count": 1,
    "avg_velocity": 1,

    # Quality and readiness features
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

    # Target label
    "readiness_label": 1
})

df = pd.DataFrame(list(cursor))

if df.empty:
    raise ValueError("No data found in MongoDB collection: historical_releases")

# ==========================================================
# DATA CLEANING
# ==========================================================

numeric_cols = [
    "sprint_count",
    "avg_velocity",
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
    if col not in df.columns:
        raise ValueError(f"Missing required column in MongoDB data: {col}")

    df[col] = pd.to_numeric(df[col], errors="coerce")

if "readiness_label" not in df.columns:
    raise ValueError("Missing target column in MongoDB data: readiness_label")

df = df.dropna(subset=numeric_cols + ["readiness_label"])

# Keep only expected labels
valid_labels = ["Ready", "At Risk", "Not Ready"]
df = df[df["readiness_label"].isin(valid_labels)].copy()

if df.empty:
    raise ValueError("No valid rows found after cleaning data.")

print(f"Loaded {len(df)} rows of data.")
print("Label distribution:", dict(df["readiness_label"].value_counts()))

# ==========================================================
# FEATURES AND TARGET
# ==========================================================

FEATURES = [
    "sprint_count",
    "avg_velocity",
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

X = df[FEATURES]
y = df[TARGET]

# Safety check for classes
label_counts = y.value_counts()

if len(label_counts) < 3:
    raise ValueError(
        "All three classes are required for this dissertation model: Ready, At Risk, Not Ready."
    )

if label_counts.min() < 2:
    raise ValueError(
        "Each class must have at least 2 records for stratified splitting and validation."
    )

# ==========================================================
# DYNAMIC THRESHOLDS
# ==========================================================

def build_dynamic_thresholds(dataframe: pd.DataFrame, target_col: str = "readiness_label"):
    """
    Builds practical threshold values based on the Ready class.
    These thresholds are useful for:
    - rule-based baseline
    - quality gate display
    - blocking factor explanation
    """

    ready_df = dataframe[dataframe[target_col] == "Ready"].copy()

    if ready_df.empty:
        raise ValueError("No 'Ready' releases found to derive thresholds.")

    thresholds = {
        "sprint_count": {
            "min": round(float(ready_df["sprint_count"].quantile(0.25)), 2),
            "label": "",
            "good": "high"
        },
        "avg_velocity": {
            "min": round(float(ready_df["avg_velocity"].quantile(0.25)), 2),
            "label": "",
            "good": "high"
        },
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
        elif "max" in value:
            value["label"] = f"<= {value['max']}"

    return thresholds


# ==========================================================
# TRAIN / TEST SPLIT
# ==========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print(f"\n[2] Split: {len(X_train)} train | {len(X_test)} test")

# ==========================================================
# CROSS VALIDATION CONFIG
# ==========================================================

cv_splits = min(5, y.value_counts().min())

if cv_splits < 2:
    raise ValueError("Not enough samples per class for cross-validation.")

cv = StratifiedKFold(
    n_splits=cv_splits,
    shuffle=True,
    random_state=42
)

print(f"[2.1] Validation Method: {cv_splits}-Fold Stratified Cross Validation")

labels_order = ["Ready", "At Risk", "Not Ready"]

# ==========================================================
# TRAIN RANDOM FOREST
# ==========================================================

print("\n[3] Training Random Forest...")

rf = RandomForestClassifier(
    n_estimators=100,
    max_depth=None,
    random_state=42,
    n_jobs=-1,
    class_weight="balanced"
)

rf_train_start = time.time()
rf.fit(X_train, y_train)
rf_training_time = round(time.time() - rf_train_start, 4)

rf_pred_start = time.time()
rf_pred = rf.predict(X_test)
rf_prediction_time = round(time.time() - rf_pred_start, 4)

rf_cv_scores = cross_val_score(
    rf,
    X,
    y,
    cv=cv,
    scoring="f1_weighted",
    n_jobs=-1
)

rf_metrics = {
    "accuracy": round(float(accuracy_score(y_test, rf_pred)), 4),
    "f1": round(float(f1_score(y_test, rf_pred, average="weighted")), 4),
    "precision": round(float(precision_score(y_test, rf_pred, average="weighted", zero_division=0)), 4),
    "recall": round(float(recall_score(y_test, rf_pred, average="weighted", zero_division=0)), 4),
    "cv_mean_f1": round(float(rf_cv_scores.mean()), 4),
    "cv_std_f1": round(float(rf_cv_scores.std()), 4),
    "training_time_seconds": rf_training_time,
    "prediction_time_seconds": rf_prediction_time
}

rf_classification_report = classification_report(
    y_test,
    rf_pred,
    labels=labels_order,
    output_dict=True,
    zero_division=0
)

print(f"    Test Accuracy : {rf_metrics['accuracy']:.2%}")
print(f"    Test F1       : {rf_metrics['f1']:.4f}")
print(f"    CV F1         : {rf_metrics['cv_mean_f1']:.4f} ± {rf_metrics['cv_std_f1']:.4f}")
print(f"    Train Time    : {rf_training_time}s")
print(f"    Predict Time  : {rf_prediction_time}s")

# ==========================================================
# TRAIN CATBOOST
# ==========================================================

print("\n[4] Training CatBoost...")

cb = CatBoostClassifier(
    iterations=100,
    learning_rate=0.1,
    depth=6,
    random_seed=42,
    verbose=False,
    loss_function="MultiClass",
    eval_metric="TotalF1"
)

cb_train_start = time.time()
cb.fit(X_train, y_train)
cb_training_time = round(time.time() - cb_train_start, 4)

cb_pred_start = time.time()
cb_pred = cb.predict(X_test)
cb_prediction_time = round(time.time() - cb_pred_start, 4)

# CatBoost predict may return shape (n, 1), so flatten it
cb_pred = np.array(cb_pred).reshape(-1)

cb_cv_scores = cross_val_score(
    cb,
    X,
    y,
    cv=cv,
    scoring="f1_weighted",
    n_jobs=-1
)

cb_metrics = {
    "accuracy": round(float(accuracy_score(y_test, cb_pred)), 4),
    "f1": round(float(f1_score(y_test, cb_pred, average="weighted")), 4),
    "precision": round(float(precision_score(y_test, cb_pred, average="weighted", zero_division=0)), 4),
    "recall": round(float(recall_score(y_test, cb_pred, average="weighted", zero_division=0)), 4),
    "cv_mean_f1": round(float(cb_cv_scores.mean()), 4),
    "cv_std_f1": round(float(cb_cv_scores.std()), 4),
    "training_time_seconds": cb_training_time,
    "prediction_time_seconds": cb_prediction_time
}

cb_classification_report = classification_report(
    y_test,
    cb_pred,
    labels=labels_order,
    output_dict=True,
    zero_division=0
)

print(f"    Test Accuracy : {cb_metrics['accuracy']:.2%}")
print(f"    Test F1       : {cb_metrics['f1']:.4f}")
print(f"    CV F1         : {cb_metrics['cv_mean_f1']:.4f} ± {cb_metrics['cv_std_f1']:.4f}")
print(f"    Train Time    : {cb_training_time}s")
print(f"    Predict Time  : {cb_prediction_time}s")

# ==========================================================
# FEATURE IMPORTANCE
# ==========================================================

rf_importance = {
    feature: round(float(value), 4)
    for feature, value in zip(FEATURES, rf.feature_importances_)
}

raw_cb_importance = cb.feature_importances_

if raw_cb_importance.sum() > 0:
    normalized_cb_importance = raw_cb_importance / raw_cb_importance.sum()
else:
    normalized_cb_importance = raw_cb_importance

cb_importance = {
    feature: round(float(value), 4)
    for feature, value in zip(FEATURES, normalized_cb_importance)
}

# ==========================================================
# CONFUSION MATRICES
# ==========================================================

rf_cm = confusion_matrix(
    y_test,
    rf_pred,
    labels=labels_order
).tolist()

cb_cm = confusion_matrix(
    y_test,
    cb_pred,
    labels=labels_order
).tolist()

# ==========================================================
# DYNAMIC THRESHOLDS
# ==========================================================

dynamic_thresholds = build_dynamic_thresholds(
    df,
    target_col="readiness_label"
)

# ==========================================================
# MODEL SELECTION SUMMARY
# ==========================================================

better_performer = (
    "Random Forest"
    if rf_metrics["cv_mean_f1"] >= cb_metrics["cv_mean_f1"]
    else "CatBoost"
)

if better_performer == "Random Forest":
    comparison_summary = (
        "Random Forest achieved equal or higher cross-validation weighted F1-score. "
        "It is retained as the primary model because it is stable for small structured numerical datasets, "
        "requires minimal preprocessing, and provides interpretable feature importance for release managers."
    )
else:
    comparison_summary = (
        "CatBoost achieved a higher cross-validation weighted F1-score, indicating stronger predictive performance. "
        "However, Random Forest can still be retained as the primary explainable model for the current small numerical dataset, "
        "while CatBoost is retained as the advanced comparison model and future-ready model for categorical features."
    )

# ==========================================================
# SAVE MODELS AND RESULTS
# ==========================================================

os.makedirs("models", exist_ok=True)

print("\n[5] Saving models...")

with open("models/random_forest.pkl", "wb") as f:
    pickle.dump(rf, f)

with open("models/catboost_model.pkl", "wb") as f:
    pickle.dump(cb, f)

results = {
    "dataset": {
        "total_records": int(len(df)),
        "train_records": int(len(X_train)),
        "test_records": int(len(X_test)),
        "test_size": 0.2,
        "validation_method": f"{cv_splits}-Fold Stratified Cross Validation",
        "primary_metric": "Weighted F1-Score",
        "label_distribution": {
            str(label): int(count)
            for label, count in y.value_counts().items()
        }
    },
    "features": FEATURES,
    "labels": labels_order,
    "model_comparison": {
        "better_performer_by_cv_f1": better_performer,
        "selection_note": comparison_summary
    },
    "random_forest": {
        "model_role": "Comparison Model",
        "metrics": rf_metrics,
        "feature_importance": rf_importance,
        "confusion_matrix": rf_cm,
        "classification_report": rf_classification_report,
        "selection_reason": (
            "Selected as the primary model because it is suitable for small structured datasets, "
            "requires minimal feature scaling or preprocessing, is robust through ensemble voting, "
            "and provides clear feature importance for explainability."
        )
    },
    "catboost": {
        "model_role": "Primary Model",
        "metrics": cb_metrics,
        "feature_importance": cb_importance,
        "confusion_matrix": cb_cm,
        "classification_report": cb_classification_report,
        "selection_reason": (
            "Selected as the comparison model because it uses sequential boosting, "
            "can capture complex non-linear patterns, and is future-ready for categorical features "
            "such as release type, module name, team name, and sprint category."
        )
    },
    "thresholds": dynamic_thresholds
}

with open("models/results.json", "w") as f:
    json.dump(results, f, indent=2)

print("    ✅ models/random_forest.pkl")
print("    ✅ models/catboost_model.pkl")
print("    ✅ models/results.json")

# ==========================================================
# FINAL PRINT SUMMARY
# ==========================================================

print("\n" + "=" * 70)
print("MODEL COMPARISON SUMMARY")
print("=" * 70)

print(f"Dataset Records        : {len(df)}")
print(f"Train Records          : {len(X_train)}")
print(f"Test Records           : {len(X_test)}")
print(f"Validation Method      : {cv_splits}-Fold Stratified Cross Validation")
print(f"Primary Metric         : Weighted F1-Score")

print("-" * 70)

print(f"Random Forest Test F1  : {rf_metrics['f1']:.4f}")
print(f"Random Forest CV F1    : {rf_metrics['cv_mean_f1']:.4f} ± {rf_metrics['cv_std_f1']:.4f}")
print(f"Random Forest Time     : train={rf_training_time}s | predict={rf_prediction_time}s")

print("-" * 70)

print(f"CatBoost Test F1       : {cb_metrics['f1']:.4f}")
print(f"CatBoost CV F1         : {cb_metrics['cv_mean_f1']:.4f} ± {cb_metrics['cv_std_f1']:.4f}")
print(f"CatBoost Time          : train={cb_training_time}s | predict={cb_prediction_time}s")

print("-" * 70)

print(f"Better Performer       : {better_performer} ✅")
print(f"Selection Note         : {comparison_summary}")

print("=" * 70)