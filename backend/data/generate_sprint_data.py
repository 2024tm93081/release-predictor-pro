import random
import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import historical_releases, sprints

random.seed(42)


# =========================
# STATUS LOGIC
# =========================

def derive_sprint_status(completed_points, planned_points, spillover_ratio):
    completion_rate = (completed_points / planned_points) * 100 if planned_points > 0 else 0

    if completion_rate >= 90 and spillover_ratio <= 10:
        return "Ready"
    elif completion_rate >= 75 and spillover_ratio <= 20:
        return "At Risk"
    return "Not Ready"


# =========================
# GOAL DISTRIBUTION
# =========================

def distribute_total_goals(total_goals, sprint_count):
    goals = []
    remaining = total_goals

    for _ in range(sprint_count):
        if remaining <= 0:
            goals.append(0)
        else:
            g = random.choice([0, 1])
            goals.append(g)
            remaining -= g

    return goals


# =========================
# MAIN GENERATION LOGIC
# =========================

def generate_sprints_for_release(release):
    release_id = release["release_id"]
    target_date = datetime.strptime(release["target_date"], "%Y-%m-%d")

    sprint_count = int(release.get("sprint_count", 3))
    avg_velocity = float(release.get("avg_velocity", 30))
    release_spillover = float(release.get("spillover_ratio", 10))
    sprint_goal_met = int(release.get("sprint_goal_met", 0))
    velocity_variance = float(release.get("velocity_variance", 5))
    readiness_label = release.get("readiness_label", "At Risk")

    sprint_records = []

    goals_distribution = distribute_total_goals(sprint_goal_met, sprint_count)

    for i in range(sprint_count):
        sprint_order = i + 1
        sprint_name = f"Sprint {sprint_order}"

        progress_factor = i / sprint_count

        # =========================
        # VELOCITY PROGRESSION
        # =========================

        if readiness_label == "Ready":
            velocity = avg_velocity + progress_factor * 5
        elif readiness_label == "At Risk":
            velocity = avg_velocity
        else:
            velocity = avg_velocity - progress_factor * 5

        velocity += random.uniform(-velocity_variance, velocity_variance)
        completed_points = max(15, round(velocity))

        # =========================
        # LAST SPRINT PRESSURE
        # =========================

        if i == sprint_count - 1:
            if readiness_label == "Ready":
                completed_points += random.randint(2, 5)
            elif readiness_label == "Not Ready":
                completed_points -= random.randint(2, 5)

        # =========================
        # PLANNED POINTS
        # =========================

        if readiness_label == "Ready":
            planned_points = completed_points + random.randint(0, 6)
        elif readiness_label == "At Risk":
            planned_points = completed_points + random.randint(4, 12)
        else:
            planned_points = completed_points + random.randint(8, 18)

        # =========================
        # SPILLOVER EVOLUTION
        # =========================

        if readiness_label == "Ready":
            base_spill = release_spillover * (1 - progress_factor)
        elif readiness_label == "At Risk":
            base_spill = release_spillover
        else:
            base_spill = release_spillover * (1 + progress_factor)

        spillover_ratio = max(0, round(base_spill + random.uniform(-3, 3), 1))

        # =========================
        # GOALS
        # =========================

        goals_met = goals_distribution[i]

        # =========================
        # DATES (2-week sprint)
        # =========================

        days_before_end = (sprint_count - i - 1) * 14
        sprint_end_date = target_date - timedelta(days=days_before_end)
        sprint_start_date = sprint_end_date - timedelta(days=13)

        # =========================
        # STATUS
        # =========================

        sprint_status = derive_sprint_status(
            completed_points,
            planned_points,
            spillover_ratio
        )

        # =========================
        # ALIGN WITH RELEASE LABEL
        # =========================

        if readiness_label == "Ready" and sprint_status == "Not Ready":
            sprint_status = "At Risk"

        if readiness_label == "Not Ready" and sprint_status == "Ready":
            sprint_status = "At Risk"

        # =========================
        # RECORD
        # =========================

        sprint_records.append({
            "release_id": release_id,
            "release_target_date": target_date.strftime("%Y-%m-%d"),
            "sprint_name": sprint_name,
            "sprint_order": sprint_order,
            "sprint_start_date": sprint_start_date.strftime("%Y-%m-%d"),
            "sprint_end_date": sprint_end_date.strftime("%Y-%m-%d"),
            "planned_points": planned_points,
            "completed_points": completed_points,
            "velocity": completed_points,
            "spillover_ratio": spillover_ratio,
            "goals_met": goals_met,
            "story_points": f"{completed_points}/{planned_points}",
            "status": sprint_status,
            "release_readiness_label": readiness_label
        })

    return sprint_records


# =========================
# MAIN EXECUTION
# =========================

def main():
    releases = list(historical_releases.find({}, {"_id": 0}))

    if not releases:
        print("No release records found in historical_releases.")
        return

    all_sprint_records = []

    for release in releases:
        if not release.get("target_date"):
            print(f"Skipping {release.get('release_id')} because target_date is missing")
            continue

        sprint_records = generate_sprints_for_release(release)
        all_sprint_records.extend(sprint_records)

    if not all_sprint_records:
        print("No sprint records generated.")
        return

    # clear old data
    sprints.delete_many({})
    sprints.insert_many(all_sprint_records)

    print(f"✅ Inserted {len(all_sprint_records)} sprint records into sprints")

    print("\nSample:")
    for row in all_sprint_records[:5]:
        print(row)


if __name__ == "__main__":
    main()