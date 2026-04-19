import pandas as pd
import random
from datetime import datetime, timedelta

records = []

major = 1
minor = 0
patch = 0

start_date = datetime(2023, 1, 15)
today = datetime(2026, 4, 17)
current_date = start_date

def next_version():
    global major, minor, patch
    if patch < 3:
        patch += 1
    else:
        patch = 0
        minor += 1
        if minor > 9:
            minor = 0
            major += 1
    return f"v{major}.{minor}.{patch}"

def pick_release_bucket():
    # realistic mix
    r = random.random()
    if r < 0.40:
        return "Ready"
    elif r < 0.80:
        return "At Risk"
    return "Not Ready"

while current_date <= today:
    release_id = next_version()
    bucket = pick_release_bucket()

    sprint_count = random.randint(3, 5)
    avg_velocity = random.randint(30, 40)

    if bucket == "Ready":
        test_coverage = round(random.uniform(84, 95), 1)
        defect_density = round(random.uniform(0.6, 2.4), 2)
        open_critical_bugs = random.randint(0, 2)
        regression_pass_rate = round(random.uniform(88, 98), 1)
        spillover_ratio = round(random.uniform(4, 12), 1)
        code_churn = round(random.uniform(8, 20), 1)
        velocity_variance = round(random.uniform(4, 10), 1)
        sprint_goal_met = random.randint(2, 3)
        effort_ratio = round(random.uniform(0.90, 1.10), 2)
        days_since_incident = random.randint(35, 90)
        readiness = random.randint(80, 95)

    elif bucket == "At Risk":
        test_coverage = round(random.uniform(70, 84), 1)
        defect_density = round(random.uniform(2.0, 4.5), 2)
        open_critical_bugs = random.randint(2, 6)
        regression_pass_rate = round(random.uniform(74, 88), 1)
        spillover_ratio = round(random.uniform(10, 22), 1)
        code_churn = round(random.uniform(18, 35), 1)
        velocity_variance = round(random.uniform(8, 18), 1)
        sprint_goal_met = random.randint(1, 2)
        effort_ratio = round(random.uniform(1.05, 1.30), 2)
        days_since_incident = random.randint(15, 45)
        readiness = random.randint(55, 74)

    else:  # Not Ready
        test_coverage = round(random.uniform(45, 69), 1)
        defect_density = round(random.uniform(4.0, 8.5), 2)
        open_critical_bugs = random.randint(5, 12)
        regression_pass_rate = round(random.uniform(55, 75), 1)
        spillover_ratio = round(random.uniform(18, 35), 1)
        code_churn = round(random.uniform(30, 55), 1)
        velocity_variance = round(random.uniform(15, 30), 1)
        sprint_goal_met = random.randint(0, 1)
        effort_ratio = round(random.uniform(1.20, 1.60), 2)
        days_since_incident = random.randint(1, 20)
        readiness = random.randint(25, 49)

    records.append({
        "release_id": release_id,
        "target_date": current_date.strftime("%Y-%m-%d"),
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
        "readiness_label": bucket,
        "readiness": readiness
    })

    # next release every 6 to 10 weeks
    current_date += timedelta(days=random.randint(42, 70))

df = pd.DataFrame(records)
df.to_csv("release_data_realistic_2023.csv", index=False)

print(f"✅ Generated {len(df)} releases")
print(df["readiness_label"].value_counts())
print(df[["release_id", "target_date", "readiness_label"]].tail(10))