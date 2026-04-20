import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, X, Search, Pencil } from "lucide-react";

type StatusType = "Ready" | "At Risk" | "Not Ready";

interface Release {
  id: string;
  targetDate: string;
  testCoverage: number;
  defectDensity: number;
  spilloverRatio: number;
  codeChurn: number;
  openCriticalBugs: number;
  regressionPassRate: number;
  sprintGoalsMet: number;
  velocityVariance: number;
  effortRatio: number;
  daysSinceIncident: number;
  mlStatus: StatusType;
  mlConfidence: number;
  ruleStatus: StatusType;
  ruleScore: number;
}

interface BackendRelease {
  release_id: string;
  target_date?: string;
  test_coverage: number;
  defect_density: number;
  spillover_ratio: number;
  code_churn: number;
  open_critical_bugs: number;
  regression_pass_rate: number;
  sprint_goal_met: number;
  velocity_variance: number;
  effort_ratio: number;
  days_since_incident: number;
  ml_prediction?: {
    status: StatusType;
    confidence: number;
  };
  rule_based?: {
    status: StatusType;
    score: number;
  };
  readiness_label?: StatusType;
  readiness?: number;
}

const defaultForm = {
  id: "",
  targetDate: "",
  testCoverage: "",
  defectDensity: "",
  spilloverRatio: "",
  codeChurn: "",
  openCriticalBugs: "",
  regressionPassRate: "",
  sprintGoalsMet: "3",
  velocityVariance: "",
  effortRatio: "",
  daysSinceIncident: "",
};

function formatDate(dateValue?: string): string {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateForInput(dateValue?: string): string {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().split("T")[0];
}

function mapBackendRelease(item: BackendRelease): Release {
  return {
    id: item.release_id,
    targetDate: formatDate(item.target_date),
    testCoverage: Number(item.test_coverage ?? 0),
    defectDensity: Number(item.defect_density ?? 0),
    spilloverRatio: Number(item.spillover_ratio ?? 0),
    codeChurn: Number(item.code_churn ?? 0),
    openCriticalBugs: Number(item.open_critical_bugs ?? 0),
    regressionPassRate: Number(item.regression_pass_rate ?? 0),
    sprintGoalsMet: Number(item.sprint_goal_met ?? 0),
    velocityVariance: Number(item.velocity_variance ?? 0),
    effortRatio: Number(item.effort_ratio ?? 0),
    daysSinceIncident: Number(item.days_since_incident ?? 0),
    mlStatus: item.ml_prediction?.status ?? item.readiness_label ?? "At Risk",
    mlConfidence: Number(item.ml_prediction?.confidence ?? item.readiness ?? 0),
    ruleStatus: item.rule_based?.status ?? "At Risk",
    ruleScore: Number(item.rule_based?.score ?? 0),
  };
}

export default function Releases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | StatusType>("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchReleases = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://127.0.0.1:5000/api/releases");
      if (!response.ok) {
        throw new Error(`Failed to fetch releases: ${response.status}`);
      }

      const data: BackendRelease[] = await response.json();

      const mapped = data
        .map(mapBackendRelease)
        .sort((a, b) => {
          const dateA = a.targetDate === "N/A" ? 0 : new Date(a.targetDate).getTime();
          const dateB = b.targetDate === "N/A" ? 0 : new Date(b.targetDate).getTime();
          return dateB - dateA;
        });

      setReleases(mapped);
    } catch (err) {
      console.error(err);
      setError("Failed to load releases from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const resetFormState = () => {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEditClick = async (releaseId: string) => {
    try {
      setError("");

      const response = await fetch(
        `http://127.0.0.1:5000/api/releases/${encodeURIComponent(releaseId)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch release details: ${response.status}`);
      }

      const item: BackendRelease = await response.json();

      setForm({
        id: item.release_id ?? "",
        targetDate: formatDateForInput(item.target_date),
        testCoverage: String(item.test_coverage ?? ""),
        defectDensity: String(item.defect_density ?? ""),
        spilloverRatio: String(item.spillover_ratio ?? ""),
        codeChurn: String(item.code_churn ?? ""),
        openCriticalBugs: String(item.open_critical_bugs ?? ""),
        regressionPassRate: String(item.regression_pass_rate ?? ""),
        sprintGoalsMet: String(item.sprint_goal_met ?? "3"),
        velocityVariance: String(item.velocity_variance ?? ""),
        effortRatio: String(item.effort_ratio ?? ""),
        daysSinceIncident: String(item.days_since_incident ?? ""),
      });

      setEditingId(releaseId);
      setShowForm(true);
    } catch (err) {
      console.error(err);

      const existingRelease = releases.find((r) => r.id === releaseId);
      if (existingRelease) {
        const parsedTargetDate =
          existingRelease.targetDate !== "N/A"
            ? new Date(existingRelease.targetDate)
            : null;

        setForm({
          id: existingRelease.id,
          targetDate:
            parsedTargetDate && !Number.isNaN(parsedTargetDate.getTime())
              ? parsedTargetDate.toISOString().split("T")[0]
              : "",
          testCoverage: String(existingRelease.testCoverage),
          defectDensity: String(existingRelease.defectDensity),
          spilloverRatio: String(existingRelease.spilloverRatio),
          codeChurn: String(existingRelease.codeChurn),
          openCriticalBugs: String(existingRelease.openCriticalBugs),
          regressionPassRate: String(existingRelease.regressionPassRate),
          sprintGoalsMet: String(existingRelease.sprintGoalsMet),
          velocityVariance: String(existingRelease.velocityVariance),
          effortRatio: String(existingRelease.effortRatio),
          daysSinceIncident: String(existingRelease.daysSinceIncident),
        });

        setEditingId(releaseId);
        setShowForm(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load release for editing.");
      }
    }
  };

  const handleAdd = async () => {
    try {
      setSaving(true);
      setError("");

      const newRelease = {
        release_id: form.id.trim(),
        target_date: form.targetDate,
        test_coverage: Number(form.testCoverage),
        defect_density: Number(form.defectDensity),
        spillover_ratio: Number(form.spilloverRatio),
        code_churn: Number(form.codeChurn),
        open_critical_bugs: Number(form.openCriticalBugs),
        regression_pass_rate: Number(form.regressionPassRate),
        sprint_goal_met: Number(form.sprintGoalsMet),
        velocity_variance: Number(form.velocityVariance),
        effort_ratio: Number(form.effortRatio),
        days_since_incident: Number(form.daysSinceIncident),
      };

      const response = await fetch("http://127.0.0.1:5000/api/releases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRelease),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add release");
      }

      if (result.release) {
        const addedRelease = mapBackendRelease(result.release);
        setReleases((prev) => [addedRelease, ...prev]);
      } else {
        await fetchReleases();
      }

      resetFormState();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save release.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    try {
      if (!editingId) return;

      setSaving(true);
      setError("");

      const updatedRelease = {
        release_id: form.id.trim(),
        target_date: form.targetDate,
        test_coverage: Number(form.testCoverage),
        defect_density: Number(form.defectDensity),
        spillover_ratio: Number(form.spilloverRatio),
        code_churn: Number(form.codeChurn),
        open_critical_bugs: Number(form.openCriticalBugs),
        regression_pass_rate: Number(form.regressionPassRate),
        sprint_goal_met: Number(form.sprintGoalsMet),
        velocity_variance: Number(form.velocityVariance),
        effort_ratio: Number(form.effortRatio),
        days_since_incident: Number(form.daysSinceIncident),
      };

      const response = await fetch(
        `http://127.0.0.1:5000/api/releases/${encodeURIComponent(editingId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedRelease),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update release");
      }

      if (result.release) {
        const mappedRelease = mapBackendRelease(result.release);
        setReleases((prev) =>
          prev.map((item) => (item.id === editingId ? mappedRelease : item))
        );
      } else {
        await fetchReleases();
      }

      resetFormState();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update release.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return releases
      .filter((r) => filter === "All" || r.mlStatus === filter)
      .filter((r) => r.id.toLowerCase().includes(search.toLowerCase()));
  }, [releases, filter, search]);

  const inputClass =
    "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Release Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Track and manage all releases
          </p>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              resetFormState();
            } else {
              setShowForm(true);
              setEditingId(null);
              setForm(defaultForm);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Release"}
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full bg-secondary border border-border rounded-md pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search releases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "All" | StatusType)}
        >
          <option value="All">All</option>
          <option value="Ready">Ready</option>
          <option value="At Risk">At Risk</option>
          <option value="Not Ready">Not Ready</option>
        </select>
      </div>

      {showForm && (
        <div className="gradient-card border border-border rounded-lg p-5 animate-slide-up">
          <h3 className="text-sm font-medium text-foreground mb-4">
            {editingId ? "Edit Release" : "Create New Release"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Release ID
              </label>
              <input
                className={inputClass}
                placeholder="v1.4.0"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                disabled={!!editingId}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Target Date
              </label>
              <input
                type="date"
                className={inputClass}
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Test Coverage %
              </label>
              <input
                type="number"
                className={inputClass}
                value={form.testCoverage}
                onChange={(e) => setForm({ ...form, testCoverage: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Defect Density
              </label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.defectDensity}
                onChange={(e) => setForm({ ...form, defectDensity: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Spillover Ratio %
              </label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.spilloverRatio}
                onChange={(e) => setForm({ ...form, spilloverRatio: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Code Churn %
              </label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.codeChurn}
                onChange={(e) => setForm({ ...form, codeChurn: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Open Critical Bugs
              </label>
              <input
                type="number"
                className={inputClass}
                value={form.openCriticalBugs}
                onChange={(e) => setForm({ ...form, openCriticalBugs: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Regression Pass Rate %
              </label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.regressionPassRate}
                onChange={(e) => setForm({ ...form, regressionPassRate: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Sprint Goals Met
              </label>
              <select
                className={inputClass}
                value={form.sprintGoalsMet}
                onChange={(e) => setForm({ ...form, sprintGoalsMet: e.target.value })}
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Velocity Variance %
              </label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.velocityVariance}
                onChange={(e) => setForm({ ...form, velocityVariance: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Effort Ratio
              </label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.effortRatio}
                onChange={(e) => setForm({ ...form, effortRatio: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Days Since Incident
              </label>
              <input
                type="number"
                className={inputClass}
                value={form.daysSinceIncident}
                onChange={(e) => setForm({ ...form, daysSinceIncident: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={resetFormState}
              className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={editingId ? handleUpdate : handleAdd}
              disabled={
                saving ||
                !form.id ||
                !form.targetDate ||
                !form.testCoverage ||
                !form.defectDensity ||
                !form.spilloverRatio ||
                !form.codeChurn ||
                !form.openCriticalBugs ||
                !form.regressionPassRate ||
                !form.velocityVariance ||
                !form.effortRatio ||
                !form.daysSinceIncident
              }
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {saving
                ? editingId
                  ? "Updating..."
                  : "Saving..."
                : editingId
                ? "Update Release"
                : "Save Release"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="gradient-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          Loading releases...
        </div>
      )}

      {error && (
        <div className="gradient-card border border-destructive/30 rounded-lg p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="gradient-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1750px] text-sm">
              <thead className="bg-secondary/60 border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-foreground">Release ID</th>
                  <th className="px-4 py-3 font-medium text-foreground">Date</th>
                  <th className="px-4 py-3 font-medium text-foreground">ML Prediction</th>
                  <th className="px-4 py-3 font-medium text-foreground">ML Confidence</th>
                  <th className="px-4 py-3 font-medium text-foreground">Rule-Based</th>
                  <th className="px-4 py-3 font-medium text-foreground">Rule Score</th>
                  <th className="px-4 py-3 font-medium text-foreground">Coverage</th>
                  <th className="px-4 py-3 font-medium text-foreground">Defect Density</th>
                  <th className="px-4 py-3 font-medium text-foreground">Critical Bugs</th>
                  <th className="px-4 py-3 font-medium text-foreground">Regression %</th>
                  <th className="px-4 py-3 font-medium text-foreground">Spillover %</th>
                  <th className="px-4 py-3 font-medium text-foreground">Code Churn %</th>
                  <th className="px-4 py-3 font-medium text-foreground">Velocity Var %</th>
                  <th className="px-4 py-3 font-medium text-foreground">Goals Met</th>
                  <th className="px-4 py-3 font-medium text-foreground">Effort Ratio</th>
                  <th className="px-4 py-3 font-medium text-foreground">Days Since Incident</th>
                  <th className="px-4 py-3 font-medium text-foreground">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r, index) => (
                  <tr
                    key={r.id}
                    className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${
                      index % 2 === 0 ? "bg-transparent" : "bg-secondary/10"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{r.id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.targetDate}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.mlStatus} />
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.mlConfidence}%</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.ruleStatus} />
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.ruleScore}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.testCoverage}%</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.defectDensity}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.openCriticalBugs}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.regressionPassRate}%</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.spilloverRatio}%</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.codeChurn}%</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.velocityVariance}%</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.sprintGoalsMet}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.effortRatio}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.daysSinceIncident}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEditClick(r.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs text-foreground hover:bg-secondary/60 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="gradient-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          No releases found.
        </div>
      )}
    </div>
  );
}