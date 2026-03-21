import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { Zap, AlertTriangle, Trophy, TrendingDown, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const sprints = [
  { name: "Sprint 24", velocity: 84, planned: 90, spillover: 8, goalsMet: 3 },
  { name: "Sprint 23", velocity: 71, planned: 85, spillover: 18, goalsMet: 2 },
  { name: "Sprint 22", velocity: 90, planned: 88, spillover: 4, goalsMet: 3 },
  { name: "Sprint 21", velocity: 65, planned: 78, spillover: 22, goalsMet: 1 },
];

const chartData = sprints.map((s) => ({ name: s.name, Planned: s.planned, Completed: s.velocity }));

const avgVelocity = (sprints.reduce((a, s) => a + s.velocity, 0) / sprints.length).toFixed(1);
const avgSpillover = Math.round(sprints.reduce((a, s) => a + s.spillover, 0) / sprints.length);
const bestSprint = sprints.reduce((a, s) => (s.velocity > a.velocity ? s : a));
const worstSprint = sprints.reduce((a, s) => (s.velocity < a.velocity ? s : a));
const avgGoal = (sprints.reduce((a, s) => a + s.goalsMet, 0) / sprints.length).toFixed(1);

function sprintStatus(velocity: number): "Ready" | "At Risk" | "Not Ready" {
  return velocity >= 80 ? "Ready" : velocity >= 60 ? "At Risk" : "Not Ready";
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs font-mono" style={{ color: p.color }}>{p.name}: {p.value} pts</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Sprints() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Sprint Analytics</h2>
        <p className="text-sm text-muted-foreground">Delivery health and velocity tracking</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Avg Velocity" value={`${avgVelocity} pts`} icon={Zap} variant="success" />
        <StatCard title="Avg Spillover" value={`${avgSpillover}%`} icon={AlertTriangle} variant="warning" />
        <StatCard title="Best Sprint" value={`${bestSprint.name}`} icon={Trophy} variant="accent" subtitle={`${bestSprint.velocity} pts`} />
        <StatCard title="Worst Sprint" value={`${worstSprint.name}`} icon={TrendingDown} variant="danger" subtitle={`${worstSprint.velocity} pts`} />
        <StatCard title="Avg Goal Met" value={`${avgGoal} / 3`} icon={Target} variant="default" />
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Sprint Comparison — Planned vs Completed</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={4} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(225, 25%, 16%)" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "hsl(220, 15%, 55%)" }} />
            <Bar dataKey="Planned" fill="hsl(199, 89%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Completed" fill="hsl(160, 100%, 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="gradient-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Sprint Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Sprint", "Velocity", "Spillover", "Goal Met", "Story Points", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sprints.map((s) => {
                const status = sprintStatus(s.velocity);
                return (
                  <tr key={s.name} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{s.name}</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={s.velocity} max={100} variant={status === "Ready" ? "success" : status === "At Risk" ? "warning" : "danger"} />
                        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{s.velocity} pts</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={s.spillover} max={30} variant={s.spillover > 15 ? "danger" : s.spillover > 10 ? "warning" : "success"} />
                        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{s.spillover}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{s.goalsMet}/3</td>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{s.velocity}/{s.planned}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
