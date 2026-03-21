import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { Package, Activity, Bug, Brain } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from "recharts";

const readinessData = [
  { name: "v2.2.9", score: 82, status: "Ready" },
  { name: "v2.3.5", score: 38, status: "Not Ready" },
  { name: "v2.3.8", score: 61, status: "At Risk" },
  { name: "v2.4.1", score: 87, status: "Ready" },
];

const velocityData = [
  { name: "Sprint 21", velocity: 65 },
  { name: "Sprint 22", velocity: 90 },
  { name: "Sprint 23", velocity: 71 },
  { name: "Sprint 24", velocity: 84 },
];

const releases = [
  { id: "v2.4.1", status: "Ready" as const, date: "25 Mar 2026", readiness: 87, coverage: 91, bugs: 3 },
  { id: "v2.3.8", status: "At Risk" as const, date: "10 Mar 2026", readiness: 61, coverage: 74, bugs: 7 },
  { id: "v2.3.5", status: "Not Ready" as const, date: "22 Feb 2026", readiness: 38, coverage: 52, bugs: 14 },
  { id: "v2.2.9", status: "Ready" as const, date: "05 Feb 2026", readiness: 82, coverage: 88, bugs: 1 },
];

const barColors: Record<string, string> = {
  Ready: "hsl(160, 100%, 45%)",
  "At Risk": "hsl(36, 91%, 55%)",
  "Not Ready": "hsl(350, 100%, 65%)",
};

const ChartTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground">{payload[0].payload.name}</p>
        <p className="text-sm font-mono font-bold text-foreground">{payload[0].value}{typeof payload[0].value === "number" && payload[0].dataKey === "score" ? "%" : " pts"}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Release Pulse Dashboard</h2>
        <p className="text-sm text-muted-foreground">Enmovil Solutions · Sprint 24</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Current Release" value="v2.4.1" icon={Package} variant="accent" subtitle="Target: 28 Mar 2026" />
        <StatCard title="Readiness Score" value="87%" icon={Activity} variant="success" subtitle="↑ 6% from last release" />
        <StatCard title="Open Critical Bugs" value="3" icon={Bug} variant="warning" subtitle="Threshold: 0" />
        <StatCard title="ML Model Accuracy" value="94%" icon={Brain} variant="accent" subtitle="Random Forest · F1: 0.94" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="gradient-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Release Readiness Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={readinessData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(225, 25%, 16%)" }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {readinessData.map((entry, idx) => (
                  <Cell key={idx} fill={barColors[entry.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="gradient-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Sprint Velocity Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Line type="monotone" dataKey="velocity" stroke="hsl(263, 86%, 76%)" strokeWidth={2.5} dot={{ fill: "hsl(263, 86%, 76%)", r: 5 }} activeDot={{ r: 7, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="gradient-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Recent Releases</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Release", "Status", "Date", "Readiness", "Test Coverage", "Open Bugs", "Action"].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{r.id}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3 w-36">
                    <ProgressBar
                      value={r.readiness}
                      variant={r.status === "Ready" ? "success" : r.status === "At Risk" ? "warning" : "danger"}
                      showLabel
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{r.coverage}%</td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{r.bugs}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-accent hover:text-accent/80 font-medium transition-colors">View</button>
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
