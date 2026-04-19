from db import historical_releases

result = historical_releases.insert_one({
    "release_id": "v1.0.0",
    "release_name": "Release v1.0.0",
    "defect_density": 2.1,
    "test_coverage": 85,
    "spillover_ratio": 10,
    "code_churn": 12,
    "velocity_variance": 8,
    "open_critical_bugs": 1,
    "regression_pass_rate": 90,
    "sprint_goal_met": 3,
    "effort_ratio": 1.1,
    "days_since_incident": 30,
    "readiness_label": "Ready"
})

print("✅ Collection created!")
print("Inserted ID:", result.inserted_id)