import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { Plus, X, Bug, Calendar } from "lucide-react";

type StatusType = "Ready" | "At Risk" | "Not Ready";

interface Release {
  id: string;
  targetDate: string;
  testCoverage: number;
  openDefects: number;
  status: StatusType;
  readiness: number;
}

const initialReleases: Release[] = [
  { id: "v2.4.1", targetDate: "2026-03-10", testCoverage: 91, openDefects: 3, status: "Ready", readiness: 87 },
  { id: "v2.3.8", targetDate: "2026-02-20", testCoverage: 78, openDefects: 7, status: "At Risk", readiness: 61 },
  { id: "v2.3.5", targetDate: "2026-01-15", testCoverage: 55, openDefects: 14, status: "Not Ready", readiness: 38 },
  { id: "v2.2.9", targetDate: "2025-12-05", testCoverage: 88, openDefects: 2, status: "Ready", readiness: 82 },
];

function computeStatus(coverage: number, defects: number): { status: StatusType; readiness: number } {
  const readiness = Math.max(0, Math.min(100, Math.round(coverage * 0.7 + Math.max(0, 30 - defects * 3))));
  const status: StatusType = readiness >= 75 ? "Ready" : readiness >= 50 ? "At Risk" : "Not Ready";
  return { status, readiness };
}

export default function Releases() {
  const [releases, setReleases] = useState<Release[]>(initialReleases);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: "", targetDate: "", testCoverage: "", openDefects: "" });

  const handleAdd = () => {
    const coverage = Number(form.testCoverage);
    const defects = Number(form.openDefects);
    const { status, readiness } = computeStatus(coverage, defects);
    setReleases([{ id: form.id, targetDate: form.targetDate, testCoverage: coverage, openDefects: defects, status, readiness }, ...releases]);
    setForm({ id: "", targetDate: "", testCoverage: "", openDefects: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Release Management</h2>
          <p className="text-sm text-muted-foreground">Track and manage releases</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Release"}
        </button>
      </div>

      {showForm && (
        <div className="gradient-card border border-border rounded-lg p-5 animate-slide-up">
          <h3 className="text-sm font-medium text-foreground mb-4">Create New Release</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Release ID</label>
              <input
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="v2.5.0"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Target Date</label>
              <input
                type="date"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Test Coverage %</label>
              <input
                type="number"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="85"
                value={form.testCoverage}
                onChange={(e) => setForm({ ...form, testCoverage: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Open Defects</label>
              <input
                type="number"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="0"
                value={form.openDefects}
                onChange={(e) => setForm({ ...form, openDefects: e.target.value })}
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!form.id || !form.targetDate}
            className="mt-4 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Release
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {releases.map((r) => (
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
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Readiness</span>
                  <span className="font-mono">{r.readiness}%</span>
                </div>
                <ProgressBar value={r.readiness} variant={r.status === "Ready" ? "success" : r.status === "At Risk" ? "warning" : "danger"} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Test Coverage</span>
                  <span className="font-mono">{r.testCoverage}%</span>
                </div>
                <ProgressBar value={r.testCoverage} variant="default" />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Bug className="h-3 w-3" />
                <span className="font-mono">{r.openDefects}</span> open defects
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
