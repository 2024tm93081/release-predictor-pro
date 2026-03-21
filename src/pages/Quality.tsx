import { StatCard } from "@/components/StatCard";
import { Shield, Bug, GitBranch, Activity, AlertCircle, Timer, TrendingUp, Calendar, Check, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const topMetrics = [
  { title: "Test Coverage", value: "91%", icon: Shield, variant: "success" as const },
  { title: "Defect Density", value: "0.3/KLOC", icon: Bug, variant: "success" as const },
  { title: "Code Churn", value: "12%", icon: GitBranch, variant: "success" as const },
  { title: "Regression Pass", value: "94%", icon: Activity, variant: "success" as const },
];

const bottomMetrics = [
  { title: "Open Critical Bugs", value: "3", icon: AlertCircle, variant: "warning" as const },
  { title: "Velocity Variance", value: "10%", icon: TrendingUp, variant: "success" as const },
  { title: "Spillover Ratio", value: "8%", icon: Timer, variant: "success" as const },
  { title: "Days Since Incident", value: "55", icon: Calendar, variant: "success" as const },
];

const gates = [
  { name: "Defect Density < 3.5/KLOC", current: "0.3", passed: true },
  { name: "Test Coverage > 80%", current: "91%", passed: true },
  { name: "Regression Pass Rate > 85%", current: "94%", passed: true },
  { name: "Spillover Ratio < 15%", current: "8%", passed: true },
  { name: "Velocity Variance < 15%", current: "10%", passed: true },
  { name: "Days Since Incident > 30", current: "55", passed: true },
  { name: "Open Critical Bugs = 0", current: "3", passed: false },
];

const passedCount = gates.filter((g) => g.passed).length;

const trendData = [
  { release: "v2.2.9", testCoverage: 82, regressionPass: 79, defectDensity: 1.2 },
  { release: "v2.3.5", testCoverage: 52, regressionPass: 50, defectDensity: 4.5 },
  { release: "v2.3.8", testCoverage: 74, regressionPass: 71, defectDensity: 2.8 },
  { release: "v2.4.1", testCoverage: 91, regressionPass: 94, defectDensity: 0.3 },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs font-mono" style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Quality() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Quality Metrics</h2>
        <p className="text-sm text-muted-foreground">Code and testing health indicators</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topMetrics.map((m) => <StatCard key={m.title} {...m} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {bottomMetrics.map((m) => <StatCard key={m.title} {...m} />)}
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">Release Quality Gates</h3>
            <p className="text-xs text-muted-foreground">{passedCount}/{gates.length} gates passed</p>
          </div>
        </div>
        <div className="space-y-3">
          {gates.map((g) => (
            <div key={g.name} className="flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-3">
                {g.passed ? (
                  <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center"><Check className="h-3.5 w-3.5 text-primary" /></div>
                ) : (
                  <div className="h-6 w-6 rounded-full bg-destructive/15 flex items-center justify-center"><X className="h-3.5 w-3.5 text-destructive" /></div>
                )}
                <span className={`text-sm ${g.passed ? "text-foreground" : "text-muted-foreground"}`}>{g.name}</span>
              </div>
              <span className={`font-mono text-xs ${g.passed ? "text-primary" : "text-destructive"}`}>Current: {g.current}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Quality Trends (Last 4 Releases)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" vertical={false} />
            <XAxis dataKey="release" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "hsl(220, 15%, 55%)" }} />
            <Line type="monotone" dataKey="testCoverage" stroke="hsl(160, 100%, 45%)" strokeWidth={2} dot={{ r: 4 }} name="Test Coverage" />
            <Line type="monotone" dataKey="regressionPass" stroke="hsl(199, 89%, 60%)" strokeWidth={2} dot={{ r: 4 }} name="Regression Pass" />
            <Line type="monotone" dataKey="defectDensity" stroke="hsl(350, 100%, 65%)" strokeWidth={2} dot={{ r: 4 }} name="Defect Density" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
