import { StatCard } from "@/components/StatCard";
import { Target, Award, Crosshair, Radio } from "lucide-react";
import { Check, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const topMetrics = [
  { title: "RF Accuracy", value: "94%", icon: Target, variant: "success" as const },
  { title: "RF F1-Score", value: "0.94", icon: Award, variant: "success" as const },
  { title: "CB Accuracy", value: "92%", icon: Target, variant: "accent" as const, subtitle: "CatBoost" },
  { title: "CB F1-Score", value: "0.92", icon: Award, variant: "accent" as const, subtitle: "CatBoost" },
  { title: "Baseline Acc", value: "67.5%", icon: Crosshair, variant: "warning" as const, subtitle: "Rule-Based" },
  { title: "Baseline F1", value: "0.59", icon: Radio, variant: "warning" as const, subtitle: "Rule-Based" },
];

const modelCards = [
  {
    name: "Random Forest", badge: "Winner 🏆", borderColor: "border-warning", glowClass: "glow-orange",
    metrics: { accuracy: "94%", f1: "0.94", precision: "0.93", recall: "0.95", cvF1: "0.94" },
    details: ["100 trees · Bootstrap sampling", "Best for small datasets"],
  },
  {
    name: "CatBoost", badge: null, borderColor: "border-accent", glowClass: "glow-blue",
    metrics: { accuracy: "92%", f1: "0.92", precision: "0.91", recall: "0.93", cvF1: "0.91" },
    details: ["100 iterations · Sequential boosting", "Native categorical support"],
  },
  {
    name: "Rule-Based Baseline", badge: null, borderColor: "border-muted-foreground/30", glowClass: "",
    metrics: { accuracy: "67.5%", f1: "0.59", precision: "—", recall: "—", cvF1: "—" },
    details: ["Fixed thresholds · No learning", "Manual checklist approach"],
  },
];

const compChart = [
  { metric: "Accuracy", "Random Forest": 94, CatBoost: 92, "Rule-Based": 67.5 },
  { metric: "F1-Score", "Random Forest": 94, CatBoost: 92, "Rule-Based": 59 },
  { metric: "Precision", "Random Forest": 93, CatBoost: 91, "Rule-Based": 55 },
  { metric: "Recall", "Random Forest": 95, CatBoost: 93, "Rule-Based": 60 },
];

const rfConfusion = [
  [14, 0, 0],
  [0, 14, 0],
  [0, 0, 12],
];

const cbConfusion = [
  [13, 1, 0],
  [0, 13, 1],
  [0, 1, 11],
];

const predictionHistory = [
  { release: "v2.4.1", rf: "Ready", cb: "Ready", rb: "Ready", actual: "Ready", rfMatch: true, cbMatch: true },
  { release: "v2.3.8", rf: "At Risk", cb: "At Risk", rb: "Ready", actual: "At Risk", rfMatch: true, cbMatch: true },
  { release: "v2.3.5", rf: "Not Ready", cb: "Not Ready", rb: "At Risk", actual: "Not Ready", rfMatch: true, cbMatch: true },
  { release: "v2.2.9", rf: "Ready", cb: "Ready", rb: "Ready", actual: "Ready", rfMatch: true, cbMatch: true },
];

const labels = ["Ready", "At Risk", "Not Ready"];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs font-mono" style={{ color: p.color }}>{p.name}: {p.value}%</p>
        ))}
      </div>
    );
  }
  return null;
};

function ConfusionMatrix({ title, data }: { title: string; data: number[][] }) {
  return (
    <div className="gradient-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-foreground mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr>
              <th className="text-xs text-muted-foreground p-2"></th>
              {labels.map((l) => <th key={l} className="text-xs text-muted-foreground p-2 font-mono">{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td className="text-xs text-muted-foreground p-2 font-mono text-left">{labels[i]}</td>
                {row.map((val, j) => (
                  <td key={j} className={`p-2 font-mono text-sm font-bold rounded ${i === j ? "bg-primary/15 text-primary" : val > 0 ? "bg-destructive/10 text-destructive" : "text-muted-foreground"}`}>
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ModelEvaluation() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Model Evaluation & Comparison</h2>
        <p className="text-sm text-muted-foreground">Empirical comparison: Random Forest vs CatBoost vs Rule-Based Baseline</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {topMetrics.map((m) => <StatCard key={m.title} {...m} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {modelCards.map((mc) => (
          <div key={mc.name} className={`gradient-card border-2 ${mc.borderColor} rounded-lg p-5 ${mc.glowClass}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">{mc.name}</h3>
              {mc.badge && <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">{mc.badge}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {Object.entries(mc.metrics).map(([k, v]) => (
                <div key={k} className="text-xs"><span className="text-muted-foreground capitalize">{k}: </span><span className="font-mono text-foreground">{v}</span></div>
              ))}
            </div>
            {mc.details.map((d, i) => (
              <p key={i} className="text-xs text-muted-foreground">{d}</p>
            ))}
          </div>
        ))}
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Model Performance Comparison</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={compChart} barGap={2} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" vertical={false} />
            <XAxis dataKey="metric" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(225, 25%, 16%)" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "hsl(220, 15%, 55%)" }} />
            <Bar dataKey="Random Forest" fill="hsl(160, 100%, 45%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="CatBoost" fill="hsl(199, 89%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Rule-Based" fill="hsl(220, 15%, 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConfusionMatrix title="Confusion Matrix — Random Forest" data={rfConfusion} />
        <ConfusionMatrix title="Confusion Matrix — CatBoost" data={cbConfusion} />
      </div>

      <div className="gradient-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Release Prediction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Release", "RF Prediction", "CatBoost", "Rule-Based", "Actual", "RF Match", "CB Match"].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {predictionHistory.map((r) => (
                <tr key={r.release} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{r.release}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{r.rf}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{r.cb}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{r.rb}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{r.actual}</td>
                  <td className="px-4 py-3">
                    {r.rfMatch ? <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center"><Check className="h-3 w-3 text-primary" /></div> : <div className="h-5 w-5 rounded-full bg-destructive/15 flex items-center justify-center"><X className="h-3 w-3 text-destructive" /></div>}
                  </td>
                  <td className="px-4 py-3">
                    {r.cbMatch ? <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center"><Check className="h-3 w-3 text-primary" /></div> : <div className="h-5 w-5 rounded-full bg-destructive/15 flex items-center justify-center"><X className="h-3 w-3 text-destructive" /></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
