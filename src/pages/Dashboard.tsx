import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { Package, Activity, Bug } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const readinessData = [
  { name: "v2.2.9", score: 82, status: "Ready" },
  { name: "v2.3.5", score: 38, status: "Not Ready" },
  { name: "v2.3.8", score: 61, status: "At Risk" },
  { name: "v2.4.1", score: 87, status: "Ready" },
];

const releases = [
  { id: "v2.4.1", status: "Ready" as const, date: "2026-03-10", progress: 87 },
  { id: "v2.3.8", status: "At Risk" as const, date: "2026-02-20", progress: 61 },
  { id: "v2.3.5", status: "Not Ready" as const, date: "2026-01-15", progress: 38 },
  { id: "v2.2.9", status: "Ready" as const, date: "2025-12-05", progress: 82 },
];

const barColors: Record<string, string> = {
  Ready: "hsl(160, 100%, 45%)",
  "At Risk": "hsl(36, 91%, 55%)",
  "Not Ready": "hsl(350, 100%, 65%)",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground">{payload[0].payload.name}</p>
        <p className="text-sm font-mono font-bold text-foreground">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Release readiness overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Current Release" value="v2.4.1" icon={Package} variant="accent" subtitle="In Progress" />
        <StatCard title="Readiness Score" value="87%" icon={Activity} variant="success" subtitle="+5% from last" />
        <StatCard title="Open Defects" value="3" icon={Bug} variant="warning" subtitle="2 critical" />
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Readiness Scores — Last 4 Releases</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={readinessData} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 12, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(225, 25%, 16%)" }} />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {readinessData.map((entry, idx) => (
                <Cell key={idx} fill={barColors[entry.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="gradient-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Recent Releases</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Release</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Date</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 w-48">Progress</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{r.id}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3">
                    <ProgressBar
                      value={r.progress}
                      variant={r.status === "Ready" ? "success" : r.status === "At Risk" ? "warning" : "danger"}
                      showLabel
                    />
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
