import { ProgressBar } from "@/components/ProgressBar";
import { Check, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const featureImportance = [
  { feature: "Regression Pass Rate", importance: 18.2 },
  { feature: "Test Coverage", importance: 18.2 },
  { feature: "Spillover Ratio", importance: 18.1 },
  { feature: "Open Critical Bugs", importance: 14.9 },
  { feature: "Defect Density", importance: 12.8 },
  { feature: "Velocity Variance", importance: 7.6 },
  { feature: "Code Churn", importance: 5.6 },
  { feature: "Days Since Incident", importance: 2.6 },
  { feature: "Effort Ratio", importance: 1.9 },
  { feature: "Sprint Goals Met", importance: 0.2 },
];

const thresholds = [
  { feature: "Defect Density", current: "0.3", threshold: "< 3.5", pass: true, progress: 9 },
  { feature: "Test Coverage", current: "91%", threshold: "> 80%", pass: true, progress: 91 },
  { feature: "Spillover Ratio", current: "8%", threshold: "< 15%", pass: true, progress: 53 },
  { feature: "Code Churn", current: "12%", threshold: "< 25%", pass: true, progress: 48 },
  { feature: "Velocity Variance", current: "10%", threshold: "< 15%", pass: true, progress: 67 },
  { feature: "Open Critical Bugs", current: "3", threshold: "= 0", pass: false, progress: 100 },
  { feature: "Regression Pass", current: "94%", threshold: "> 85%", pass: true, progress: 94 },
  { feature: "Sprint Goals Met", current: "3", threshold: ">= 2", pass: true, progress: 100 },
  { feature: "Effort Ratio", current: "1.05", threshold: "< 1.2", pass: true, progress: 88 },
  { feature: "Days Since Incident", current: "55", threshold: "> 30", pass: true, progress: 100 },
];

const insights = [
  {
    color: "border-accent glow-purple",
    title: "Top Predictor",
    text: "Regression Pass Rate and Test Coverage together account for 36.4% of prediction influence",
  },
  {
    color: "border-warning glow-orange",
    title: "Main Risk Driver",
    text: "Open Critical Bugs has 14.9% importance — even 1 critical bug significantly increases risk",
  },
  {
    color: "border-info glow-blue",
    title: "Low Impact",
    text: "Sprint Goals Met (0.2%) has the lowest feature importance — suggesting delivery consistency matters less than quality metrics",
  },
];

const ChartTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground">{payload[0].payload.feature}</p>
        <p className="text-sm font-mono font-bold text-foreground">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

export default function FeatureInsights() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Feature Insights</h2>
        <p className="text-sm text-muted-foreground">Which metrics drive release readiness — from Random Forest feature importance analysis</p>
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-foreground mb-1">Random Forest Feature Importance</h3>
        <p className="text-xs text-muted-foreground mb-4">Higher % = stronger influence on readiness prediction</p>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={featureImportance} layout="vertical" barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
            <YAxis type="category" dataKey="feature" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(225, 25%, 16%)" }} />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
              {featureImportance.map((_, idx) => (
                <Cell key={idx} fill={idx < 5 ? "hsl(263, 86%, 76%)" : "hsl(220, 15%, 45%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">Feature Thresholds & Current Status</h3>
        <p className="text-xs text-muted-foreground mb-4">Release v2.4.1 metrics vs thresholds</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {thresholds.map((t) => (
            <div key={t.feature} className="gradient-card border border-border rounded-lg p-4 hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground font-medium">{t.feature}</span>
                {t.pass ? (
                  <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center"><Check className="h-3 w-3 text-primary" /></div>
                ) : (
                  <div className="h-5 w-5 rounded-full bg-destructive/15 flex items-center justify-center"><X className="h-3 w-3 text-destructive" /></div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Current: <span className="font-mono text-foreground">{t.current}</span></span>
                <span>Threshold: <span className="font-mono text-foreground">{t.threshold}</span></span>
              </div>
              <ProgressBar value={t.progress} variant={t.pass ? "success" : "danger"} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-4">Key Insights from ML Analysis</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {insights.map((ins) => (
            <div key={ins.title} className={`gradient-card border-2 ${ins.color} rounded-lg p-5`}>
              <h4 className="text-sm font-semibold text-foreground mb-2">{ins.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
