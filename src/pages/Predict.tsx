import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { Brain, Loader2, Check, X, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

type StatusType = "Ready" | "At Risk" | "Not Ready";

const releaseOptions = ["v2.4.1", "v2.3.8", "v2.3.5", "v2.2.9", "Manual Input"];
const modelOptions = [
  { label: "🌳 Random Forest (Primary)", value: "Random Forest" },
  { label: "🚀 CatBoost (Comparison)", value: "CatBoost" },
  { label: "📋 Rule-Based Baseline", value: "Rule-Based" },
];

interface PredictionResult {
  status: StatusType;
  confidence: number;
  probReady: number;
  probAtRisk: number;
  probNotReady: number;
  description: string;
  blockingFactors: { name: string; current: string; required: string; pass: boolean }[];
}

const predictions: Record<string, Record<string, PredictionResult>> = {
  "v2.4.1": {
    "Random Forest": { status: "Ready", confidence: 92, probReady: 92, probAtRisk: 6, probNotReady: 2, description: "Random Forest — 100 trees voted · 92 of 100 agreed", blockingFactors: [
      { name: "Open Critical Bugs", current: "3", required: "0", pass: false },
      { name: "Test Coverage", current: "91%", required: ">80%", pass: true },
      { name: "Defect Density", current: "0.3", required: "<3.5", pass: true },
      { name: "Regression Pass", current: "94%", required: ">85%", pass: true },
      { name: "Spillover Ratio", current: "8%", required: "<15%", pass: true },
    ]},
    "CatBoost": { status: "Ready", confidence: 89, probReady: 89, probAtRisk: 8, probNotReady: 3, description: "CatBoost — 100 iterations · confidence 89%", blockingFactors: [
      { name: "Open Critical Bugs", current: "3", required: "0", pass: false },
      { name: "Test Coverage", current: "91%", required: ">80%", pass: true },
      { name: "Defect Density", current: "0.3", required: "<3.5", pass: true },
    ]},
    "Rule-Based": { status: "Ready", confidence: 71, probReady: 71, probAtRisk: 20, probNotReady: 9, description: "Rule-Based — Fixed thresholds", blockingFactors: [
      { name: "Open Critical Bugs", current: "3", required: "0", pass: false },
      { name: "Test Coverage", current: "91%", required: ">80%", pass: true },
    ]},
  },
  "v2.3.8": {
    "Random Forest": { status: "At Risk", confidence: 74, probReady: 18, probAtRisk: 74, probNotReady: 8, description: "Random Forest — 100 trees voted · 74 of 100 agreed", blockingFactors: [
      { name: "Open Critical Bugs", current: "7", required: "0", pass: false },
      { name: "Spillover Ratio", current: "18%", required: "<15%", pass: false },
      { name: "Test Coverage", current: "74%", required: ">80%", pass: false },
      { name: "Regression Pass", current: "71%", required: ">85%", pass: false },
    ]},
    "CatBoost": { status: "At Risk", confidence: 70, probReady: 20, probAtRisk: 70, probNotReady: 10, description: "CatBoost — 100 iterations", blockingFactors: [
      { name: "Open Critical Bugs", current: "7", required: "0", pass: false },
      { name: "Spillover Ratio", current: "18%", required: "<15%", pass: false },
    ]},
    "Rule-Based": { status: "Ready", confidence: 55, probReady: 55, probAtRisk: 30, probNotReady: 15, description: "Rule-Based — Fixed thresholds", blockingFactors: [
      { name: "Open Critical Bugs", current: "7", required: "0", pass: false },
    ]},
  },
  "v2.3.5": {
    "Random Forest": { status: "Not Ready", confidence: 85, probReady: 5, probAtRisk: 10, probNotReady: 85, description: "Random Forest — 100 trees voted · 85 of 100 agreed", blockingFactors: [
      { name: "Open Critical Bugs", current: "14", required: "0", pass: false },
      { name: "Test Coverage", current: "52%", required: ">80%", pass: false },
      { name: "Defect Density", current: "4.5", required: "<3.5", pass: false },
      { name: "Regression Pass", current: "50%", required: ">85%", pass: false },
      { name: "Spillover Ratio", current: "22%", required: "<15%", pass: false },
    ]},
    "CatBoost": { status: "Not Ready", confidence: 82, probReady: 6, probAtRisk: 12, probNotReady: 82, description: "CatBoost — 100 iterations", blockingFactors: [
      { name: "Open Critical Bugs", current: "14", required: "0", pass: false },
      { name: "Test Coverage", current: "52%", required: ">80%", pass: false },
    ]},
    "Rule-Based": { status: "At Risk", confidence: 48, probReady: 20, probAtRisk: 48, probNotReady: 32, description: "Rule-Based — Fixed thresholds", blockingFactors: [
      { name: "Open Critical Bugs", current: "14", required: "0", pass: false },
    ]},
  },
  "v2.2.9": {
    "Random Forest": { status: "Ready", confidence: 88, probReady: 88, probAtRisk: 9, probNotReady: 3, description: "Random Forest — 100 trees voted · 88 of 100 agreed", blockingFactors: [
      { name: "Test Coverage", current: "88%", required: ">80%", pass: true },
      { name: "Defect Density", current: "1.2", required: "<3.5", pass: true },
      { name: "Regression Pass", current: "79%", required: ">85%", pass: false },
    ]},
    "CatBoost": { status: "Ready", confidence: 84, probReady: 84, probAtRisk: 12, probNotReady: 4, description: "CatBoost — 100 iterations", blockingFactors: [
      { name: "Test Coverage", current: "88%", required: ">80%", pass: true },
    ]},
    "Rule-Based": { status: "Ready", confidence: 65, probReady: 65, probAtRisk: 25, probNotReady: 10, description: "Rule-Based — Fixed thresholds", blockingFactors: [
      { name: "Test Coverage", current: "88%", required: ">80%", pass: true },
    ]},
  },
};

const featureImpact = [
  { feature: "Test Coverage", impact: 0.38 },
  { feature: "Regression Pass", impact: 0.22 },
  { feature: "Sprint Goals Met", impact: 0.15 },
  { feature: "Days Since Incident", impact: 0.12 },
  { feature: "Velocity Variance", impact: -0.08 },
  { feature: "Code Churn", impact: -0.14 },
  { feature: "Defect Density", impact: -0.18 },
  { feature: "Open Critical Bugs", impact: -0.24 },
  { feature: "Spillover Ratio", impact: -0.30 },
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
  const [release, setRelease] = useState(releaseOptions[0]);
  const [model, setModel] = useState(modelOptions[0].value);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [manualInputs, setManualInputs] = useState({
    defectDensity: "0.3", testCoverage: "91", spilloverRatio: "8", codeChurn: "12", velocityVariance: "10",
    openCriticalBugs: "3", regressionPassRate: "94", sprintGoalsMet: "3", effortRatio: "1.05", daysSinceIncident: "55",
  });

  const runPrediction = () => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      if (release === "Manual Input") {
        // Simulate prediction for manual input
        const bugs = Number(manualInputs.openCriticalBugs);
        const coverage = Number(manualInputs.testCoverage);
        const score = Math.max(0, Math.min(100, Math.round(coverage * 0.7 + Math.max(0, 30 - bugs * 3))));
        const status: StatusType = score >= 75 ? "Ready" : score >= 50 ? "At Risk" : "Not Ready";
        setResult({
          status, confidence: score,
          probReady: status === "Ready" ? score : 10,
          probAtRisk: status === "At Risk" ? score : 10,
          probNotReady: status === "Not Ready" ? score : 5,
          description: `${model} — simulated prediction`,
          blockingFactors: [
            { name: "Open Critical Bugs", current: manualInputs.openCriticalBugs, required: "0", pass: bugs === 0 },
            { name: "Test Coverage", current: `${manualInputs.testCoverage}%`, required: ">80%", pass: coverage > 80 },
          ],
        });
      } else {
        setResult(predictions[release]?.[model] ?? null);
      }
      setLoading(false);
    }, 1500);
  };

  const isManual = release === "Manual Input";
  const inputClass = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Readiness Prediction</h2>
        <p className="text-sm text-muted-foreground">ML-powered release readiness analysis using Random Forest and CatBoost</p>
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Select Release</label>
            <select className={inputClass} value={release} onChange={(e) => { setRelease(e.target.value); setResult(null); }}>
              {releaseOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Select ML Model</label>
            <select className={inputClass} value={model} onChange={(e) => { setModel(e.target.value); setResult(null); }}>
              {modelOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <button
            onClick={runPrediction}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 uppercase tracking-wider glow-green"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {loading ? "Running..." : "Run Prediction"}
          </button>
        </div>

        {isManual && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4 pt-4 border-t border-border/50">
            {Object.entries(manualInputs).map(([key, val]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                <input className={inputClass} value={val} onChange={(e) => setManualInputs({ ...manualInputs, [key]: e.target.value })} />
              </div>
            ))}
          </div>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up">
          <div className="gradient-card border border-border rounded-lg p-6 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Prediction Result</p>
            <StatusBadge status={result.status} className="text-base px-4 py-1.5" />
            <p className="mt-3 font-mono text-4xl font-bold text-foreground">{result.confidence}%</p>
            <p className="text-xs text-muted-foreground mt-1">{result.description}</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground w-20 text-right">Ready</span><ProgressBar value={result.probReady} variant="success" /><span className="font-mono text-xs text-foreground w-10">{result.probReady}%</span></div>
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground w-20 text-right">At Risk</span><ProgressBar value={result.probAtRisk} variant="warning" /><span className="font-mono text-xs text-foreground w-10">{result.probAtRisk}%</span></div>
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground w-20 text-right">Not Ready</span><ProgressBar value={result.probNotReady} variant="danger" /><span className="font-mono text-xs text-foreground w-10">{result.probNotReady}%</span></div>
            </div>
          </div>

          <div className="gradient-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-foreground mb-4">Blocking Factors</h3>
            {result.blockingFactors.every((f) => f.pass) ? (
              <div className="flex items-center gap-2 text-primary"><Check className="h-5 w-5" /><span className="text-sm">No blocking factors! Safe to release.</span></div>
            ) : (
              <div className="space-y-2">
                {result.blockingFactors.filter((f) => !f.pass).map((f) => (
                  <div key={f.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <X className="h-4 w-4 text-destructive shrink-0" />
                    <div className="text-sm"><span className="text-foreground">{f.name}</span><span className="text-muted-foreground ml-2">Current: {f.current} | Required: {f.required}</span></div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-3 mb-1">Healthy Metrics</p>
                {result.blockingFactors.filter((f) => f.pass).map((f) => (
                  <div key={f.name} className="flex items-center gap-2 text-xs text-primary">
                    <Check className="h-3.5 w-3.5" /><span>{f.name}: {f.current}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="gradient-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-foreground mb-1">Feature Impact on Prediction</h3>
        <p className="text-xs text-muted-foreground mb-4">Green = positive impact, Red = negative impact</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={featureImpact} layout="vertical" barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[-0.4, 0.4]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
            <YAxis type="category" dataKey="feature" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
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
