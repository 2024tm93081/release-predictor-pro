import { StatCard } from "@/components/StatCard";
import { Target, Award, Crosshair, Radio, Check, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const modelMetrics = [
  { title: "Accuracy", value: "85.5%", icon: Target, variant: "success" as const },
  { title: "F1 Score", value: "0.86", icon: Award, variant: "accent" as const },
  { title: "Precision", value: "88%", icon: Crosshair, variant: "success" as const },
  { title: "Recall", value: "83%", icon: Radio, variant: "warning" as const },
];

const comparison = [
  { release: "v2.4.1", ml: "Ready", rule: "Ready", actual: "Ready", match: true },
  { release: "v2.3.8", ml: "At Risk", rule: "At Risk", actual: "At Risk", match: true },
  { release: "v2.3.5", ml: "Not Ready", rule: "At Risk", actual: "Not Ready", match: false },
  { release: "v2.2.9", ml: "Ready", rule: "Ready", actual: "Ready", match: true },
];

const compChart = [
  { metric: "Accuracy", ML: 85.5, RuleBased: 72 },
  { metric: "F1 Score", ML: 86, RuleBased: 70 },
];

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

export default function Reports() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Reports & Analysis</h2>
        <p className="text-sm text-muted-foreground">Model performance and comparisons</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {modelMetrics.map((m) => (
          <StatCard key={m.title} {...m} />
        ))}
      </div>

      <div className="gradient-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Prediction Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Release", "ML Model", "Rule-Based", "Actual", "Match"].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((r) => (
                <tr key={r.release} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{r.release}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{r.ml}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{r.rule}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{r.actual}</td>
                  <td className="px-4 py-3">
                    {r.match ? (
                      <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-destructive/15 flex items-center justify-center">
                        <X className="h-3 w-3 text-destructive" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">ML Model vs Rule-Based</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={compChart} layout="vertical" barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
            <YAxis type="category" dataKey="metric" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(225, 25%, 16%)" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "hsl(220, 15%, 55%)" }} />
            <Bar dataKey="ML" fill="hsl(160, 100%, 45%)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="RuleBased" fill="hsl(263, 86%, 76%)" radius={[0, 4, 4, 0]} name="Rule-Based" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
