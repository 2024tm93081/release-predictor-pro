import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Brain, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

type StatusType = "Ready" | "At Risk" | "Not Ready";

const releases = ["v2.4.1", "v2.3.8", "v2.3.5", "v2.2.9"];
const models = ["Ensemble", "Logistic Regression", "Random Forest"];

const predictions: Record<string, Record<string, { status: StatusType; confidence: number }>> = {
  "v2.4.1": {
    Ensemble: { status: "Ready", confidence: 92 },
    "Logistic Regression": { status: "Ready", confidence: 87 },
    "Random Forest": { status: "Ready", confidence: 89 },
  },
  "v2.3.8": {
    Ensemble: { status: "At Risk", confidence: 74 },
    "Logistic Regression": { status: "At Risk", confidence: 68 },
    "Random Forest": { status: "Ready", confidence: 58 },
  },
  "v2.3.5": {
    Ensemble: { status: "Not Ready", confidence: 85 },
    "Logistic Regression": { status: "Not Ready", confidence: 79 },
    "Random Forest": { status: "At Risk", confidence: 62 },
  },
  "v2.2.9": {
    Ensemble: { status: "Ready", confidence: 88 },
    "Logistic Regression": { status: "Ready", confidence: 82 },
    "Random Forest": { status: "Ready", confidence: 84 },
  },
};

const featureImpact = [
  { feature: "Test Coverage", impact: 0.35 },
  { feature: "Sprint Velocity", impact: 0.22 },
  { feature: "Defect Density", impact: -0.28 },
  { feature: "Code Churn", impact: -0.18 },
  { feature: "Spillover Ratio", impact: -0.12 },
];

const ImpactTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    const val = payload[0].value;
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground">{payload[0].payload.feature}</p>
        <p className="text-sm font-mono font-bold text-foreground">{val > 0 ? "+" : ""}{(val * 100).toFixed(0)}%</p>
      </div>
    );
  }
  return null;
};

export default function Predict() {
  const [release, setRelease] = useState(releases[0]);
  const [model, setModel] = useState(models[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: StatusType; confidence: number } | null>(null);

  const runPrediction = () => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setResult(predictions[release][model]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Readiness Prediction</h2>
        <p className="text-sm text-muted-foreground">ML-powered release readiness analysis</p>
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Release</label>
            <select
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              value={release}
              onChange={(e) => { setRelease(e.target.value); setResult(null); }}
            >
              {releases.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ML Model</label>
            <select
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={model}
              onChange={(e) => { setModel(e.target.value); setResult(null); }}
            >
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button
            onClick={runPrediction}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 uppercase tracking-wider"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {loading ? "Running..." : "Run Prediction"}
          </button>
        </div>
      </div>

      {result && (
        <div className="gradient-card border border-border rounded-lg p-6 animate-slide-up text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Prediction Result</p>
          <div className="flex items-center justify-center gap-4">
            <StatusBadge status={result.status} className="text-base px-4 py-1.5" />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold text-foreground">{result.confidence}%</p>
          <p className="text-xs text-muted-foreground mt-1">Confidence Score</p>
        </div>
      )}

      <div className="gradient-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Feature Impact Analysis</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={featureImpact} layout="vertical" barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} domain={[-0.4, 0.4]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
            <YAxis type="category" dataKey="feature" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
            <Tooltip content={<ImpactTooltip />} cursor={{ fill: "hsl(225, 25%, 16%)" }} />
            <ReferenceLine x={0} stroke="hsl(225, 25%, 25%)" />
            <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
              {featureImpact.map((entry, idx) => (
                <Cell key={idx} fill={entry.impact > 0 ? "hsl(160, 100%, 45%)" : "hsl(350, 100%, 65%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
