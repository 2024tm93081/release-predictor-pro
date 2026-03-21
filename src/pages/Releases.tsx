import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { Plus, X, Bug, Calendar, Search } from "lucide-react";

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
  status: StatusType;
  readiness: number;
}

const initialReleases: Release[] = [
  { id: "v2.4.1", targetDate: "25 Mar 2026", testCoverage: 91, defectDensity: 0.3, spilloverRatio: 8, codeChurn: 12, openCriticalBugs: 3, regressionPassRate: 94, sprintGoalsMet: 3, velocityVariance: 10, effortRatio: 1.05, daysSinceIncident: 55, status: "Ready", readiness: 87 },
  { id: "v2.3.8", targetDate: "10 Mar 2026", testCoverage: 74, defectDensity: 2.8, spilloverRatio: 18, codeChurn: 20, openCriticalBugs: 7, regressionPassRate: 71, sprintGoalsMet: 2, velocityVariance: 18, effortRatio: 1.15, daysSinceIncident: 30, status: "At Risk", readiness: 61 },
  { id: "v2.3.5", targetDate: "22 Feb 2026", testCoverage: 52, defectDensity: 4.5, spilloverRatio: 22, codeChurn: 30, openCriticalBugs: 14, regressionPassRate: 50, sprintGoalsMet: 1, velocityVariance: 25, effortRatio: 1.30, daysSinceIncident: 10, status: "Not Ready", readiness: 38 },
  { id: "v2.2.9", targetDate: "05 Feb 2026", testCoverage: 88, defectDensity: 1.2, spilloverRatio: 10, codeChurn: 15, openCriticalBugs: 1, regressionPassRate: 79, sprintGoalsMet: 3, velocityVariance: 8, effortRatio: 1.02, daysSinceIncident: 90, status: "Ready", readiness: 82 },
];

const defaultForm = {
  id: "", targetDate: "", testCoverage: "", defectDensity: "", spilloverRatio: "", codeChurn: "",
  openCriticalBugs: "", regressionPassRate: "", sprintGoalsMet: "3", velocityVariance: "", effortRatio: "", daysSinceIncident: "",
};

function computeStatus(coverage: number, defects: number): { status: StatusType; readiness: number } {
  const readiness = Math.max(0, Math.min(100, Math.round(coverage * 0.7 + Math.max(0, 30 - defects * 3))));
  const status: StatusType = readiness >= 75 ? "Ready" : readiness >= 50 ? "At Risk" : "Not Ready";
  return { status, readiness };
}

export default function Releases() {
  const [releases, setReleases] = useState<Release[]>(initialReleases);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | StatusType>("All");

  const handleAdd = () => {
    const coverage = Number(form.testCoverage);
    const bugs = Number(form.openCriticalBugs);
    const { status, readiness } = computeStatus(coverage, bugs);
    const newRelease: Release = {
      id: form.id, targetDate: form.targetDate, testCoverage: coverage,
      defectDensity: Number(form.defectDensity), spilloverRatio: Number(form.spilloverRatio),
      codeChurn: Number(form.codeChurn), openCriticalBugs: bugs,
      regressionPassRate: Number(form.regressionPassRate), sprintGoalsMet: Number(form.sprintGoalsMet),
      velocityVariance: Number(form.velocityVariance), effortRatio: Number(form.effortRatio),
      daysSinceIncident: Number(form.daysSinceIncident), status, readiness,
    };
    setReleases([newRelease, ...releases]);
    setForm(defaultForm);
    setShowForm(false);
  };

  const filtered = releases
    .filter((r) => filter === "All" || r.status === filter)
    .filter((r) => r.id.toLowerCase().includes(search.toLowerCase()));

  const inputClass = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Release Management</h2>
          <p className="text-sm text-muted-foreground">Track and manage all releases</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Release"}
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="All">All</option>
          <option value="Ready">Ready</option>
          <option value="At Risk">At Risk</option>
          <option value="Not Ready">Not Ready</option>
        </select>
      </div>

      {showForm && (
        <div className="gradient-card border border-border rounded-lg p-5 animate-slide-up">
          <h3 className="text-sm font-medium text-foreground mb-4">Create New Release</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Release ID</label>
              <input className={inputClass} placeholder="v2.5.0" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Target Date</label>
              <input type="date" className={inputClass} value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Test Coverage %</label>
              <input type="number" className={inputClass} placeholder="85" value={form.testCoverage} onChange={(e) => setForm({ ...form, testCoverage: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Defect Density</label>
              <input type="number" step="0.1" className={inputClass} placeholder="0.3" value={form.defectDensity} onChange={(e) => setForm({ ...form, defectDensity: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Spillover Ratio %</label>
              <input type="number" className={inputClass} placeholder="8" value={form.spilloverRatio} onChange={(e) => setForm({ ...form, spilloverRatio: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Code Churn %</label>
              <input type="number" className={inputClass} placeholder="12" value={form.codeChurn} onChange={(e) => setForm({ ...form, codeChurn: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Open Critical Bugs</label>
              <input type="number" className={inputClass} placeholder="0" value={form.openCriticalBugs} onChange={(e) => setForm({ ...form, openCriticalBugs: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Regression Pass Rate %</label>
              <input type="number" className={inputClass} placeholder="94" value={form.regressionPassRate} onChange={(e) => setForm({ ...form, regressionPassRate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sprint Goals Met</label>
              <select className={inputClass} value={form.sprintGoalsMet} onChange={(e) => setForm({ ...form, sprintGoalsMet: e.target.value })}>
                <option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Velocity Variance %</label>
              <input type="number" className={inputClass} placeholder="10" value={form.velocityVariance} onChange={(e) => setForm({ ...form, velocityVariance: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Effort Ratio</label>
              <input type="number" step="0.01" className={inputClass} placeholder="1.05" value={form.effortRatio} onChange={(e) => setForm({ ...form, effortRatio: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Days Since Incident</label>
              <input type="number" className={inputClass} placeholder="55" value={form.daysSinceIncident} onChange={(e) => setForm({ ...form, daysSinceIncident: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={!form.id || !form.targetDate} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">Save Release</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((r) => (
          <div key={r.id} className="gradient-card border border-border rounded-lg p-5 animate-slide-up hover:border-primary/20 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-mono text-lg font-bold text-foreground">{r.id}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" /> {r.targetDate}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Readiness</span><span className="font-mono">{r.readiness}%</span></div>
                <ProgressBar value={r.readiness} variant={r.status === "Ready" ? "success" : r.status === "At Risk" ? "warning" : "danger"} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Test Coverage</span><span className="font-mono">{r.testCoverage}%</span></div>
                <ProgressBar value={r.testCoverage} variant="default" />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                <span>Defect Density: <span className="font-mono text-foreground">{r.defectDensity}/KLOC</span></span>
                <span>Regression Pass: <span className="font-mono text-foreground">{r.regressionPassRate}%</span></span>
                <span className="flex items-center gap-1"><Bug className="h-3 w-3" /> Critical Bugs: <span className="font-mono text-foreground">{r.openCriticalBugs}</span></span>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
              <button className="text-xs text-accent hover:text-accent/80 font-medium transition-colors">View Details</button>
              <span className="text-border">·</span>
              <button className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">Predict</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
