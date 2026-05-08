import random
import numpy as np
from datetime import datetime, timedelta
import sys
import os
from collections import Counter

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import historical_releases

TOTAL_RECORDS = 500
SEED = 42

START_DATE = datetime(2023, 1, 15)
TODAY = datetime(2026, 4, 17)

random.seed(SEED)
np.random.seed(SEED)


def clamp(v, low, high):
    return max(low, min(v, high))


def next_version(state):
    state["patch"] += 1
    if state["patch"] > 3:
        state["patch"] = 0
        state["minor"] += 1
    if state["minor"] > 9:
        state["minor"] = 0
        state["major"] += 1
    return f"v{state['major']}.{state['minor']}.{state['patch']}"


def normal(mean, std, low, high, decimals=1):
    return round(clamp(np.random.normal(mean, std), low, high), decimals)


def generate_raw_features():
    sprint_count = random.randint(3, 5)

    avg_velocity = normal(35, 5, 24, 46, 1)
    test_coverage = normal(76, 11, 45, 98, 1)
    defect_density = normal(3.6, 1.7, 0.4, 9.5, 2)
    spillover_ratio = normal(18, 9, 1, 42, 1)
    code_churn = normal(30, 13, 5, 68, 1)
    open_critical_bugs = int(clamp(round(np.random.normal(4, 3)), 0, 15))
    regression_pass_rate = normal(80, 9, 50, 99, 1)
    sprint_goal_met = random.randint(0, sprint_count)
    velocity_variance = normal(13, 7, 2, 36, 1)
    effort_ratio = normal(1.15, 0.22, 0.8, 1.85, 2)
    days_since_incident = int(clamp(round(np.random.normal(32, 22)), 1, 120))

    return {
        "sprint_count": sprint_count,
        "avg_velocity": avg_velocity,
        "test_coverage": test_coverage,
        "defect_density": defect_density,
        "spillover_ratio": spillover_ratio,
        "code_churn": code_churn,
        "open_critical_bugs": open_critical_bugs,
        "regression_pass_rate": regression_pass_rate,
        "sprint_goal_met": sprint_goal_met,
        "velocity_variance": velocity_variance,
        "effort_ratio": effort_ratio,
        "days_since_incident": days_since_incident,
    }


def derive_label(features):
    """
    Non-linear risk logic.
    This is realistic because release readiness is rarely decided by one metric.
    CatBoost usually handles these interaction patterns slightly better.
    """

    score = 0

    # Positive signals
    score += (features["test_coverage"] - 70) * 0.9
    score += (features["regression_pass_rate"] - 75) * 0.8
    score += features["sprint_goal_met"] * 5
    score += min(features["days_since_incident"], 60) * 0.25

    # Negative signals
    score -= features["defect_density"] * 5.5
    score -= features["open_critical_bugs"] * 4.2
    score -= features["spillover_ratio"] * 0.9
    score -= features["code_churn"] * 0.35
    score -= features["velocity_variance"] * 0.8
    score -= abs(features["effort_ratio"] - 1.0) * 22

    # Non-linear interaction penalties
    if features["open_critical_bugs"] >= 6 and features["test_coverage"] < 78:
        score -= 18

    if features["defect_density"] > 5 and features["regression_pass_rate"] < 78:
        score -= 16

    if features["code_churn"] > 42 and features["spillover_ratio"] > 24:
        score -= 14

    if features["velocity_variance"] > 20 and features["sprint_goal_met"] <= 1:
        score -= 10

    # Non-linear recovery conditions
    if (
        features["test_coverage"] > 86
        and features["regression_pass_rate"] > 90
        and features["open_critical_bugs"] <= 2
    ):
        score += 18

    if (
        features["defect_density"] < 2.2
        and features["spillover_ratio"] < 12
        and features["effort_ratio"] <= 1.12
    ):
        score += 12

    # Real-world ambiguity/noise
    score += random.uniform(-18, 18)

    if score >= -25:
        label = "Ready"
    elif score >= -60:
        label = "At Risk"
    else:
        label = "Not Ready"

    # Controlled label noise: realistic but not too much
    if random.random() < 0.07:
        if label == "Ready":
            label = random.choice(["Ready", "At Risk"])
        elif label == "Not Ready":
            label = random.choice(["Not Ready", "At Risk"])
        else:
            label = random.choice(["Ready", "At Risk", "Not Ready"])

    return label, score


def calculate_readiness_score(label, features, raw_score):
    if label == "Ready":
        base = 78
    elif label == "At Risk":
        base = 58
    else:
        base = 36

    score = (
        base
        + raw_score * 0.35
        + (features["test_coverage"] - 75) * 0.12
        + (features["regression_pass_rate"] - 80) * 0.10
        - features["open_critical_bugs"] * 0.7
        - features["defect_density"] * 0.9
        - features["spillover_ratio"] * 0.10
        + random.uniform(-4, 4)
    )

    return int(clamp(round(score), 20, 98))


def main():
    print("🚀 Generating realistic release data with non-linear patterns...")

    records = []
    streams = 25

    for s in range(streams):
        current_date = START_DATE + timedelta(days=random.randint(0, 30))
        version_state = {"major": 1, "minor": 0, "patch": 0}

        while current_date <= TODAY:
            version = next_version(version_state)

            features = generate_raw_features()
            label, raw_score = derive_label(features)
            readiness = calculate_readiness_score(label, features, raw_score)

            records.append({
                "release_id": f"{version}_S{s}",
                "target_date": current_date.strftime("%Y-%m-%d"),
                "readiness_label": label,
                "readiness": readiness,
                **features
            })

            current_date += timedelta(days=random.randint(42, 70))

    records = sorted(records, key=lambda x: x["target_date"])[:TOTAL_RECORDS]

    historical_releases.delete_many({})
    historical_releases.insert_many(records)

    print(f"✅ Inserted {len(records)} realistic releases into MongoDB")
    print("Distribution:", dict(Counter([r["readiness_label"] for r in records])))


if __name__ == "__main__":
    main()