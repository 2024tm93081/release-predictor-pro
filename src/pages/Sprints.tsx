import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { Zap, AlertTriangle, Trophy, Hash } from "lucide-react";

const sprints = [
  { name: "Sprint 24", velocity: 84, planned: 90, spillover: 8, completed: 84 },
  { name: "Sprint 23", velocity: 71, planned: 85, spillover: 18, completed: 71 },
  { name: "Sprint 22", velocity: 90, planned: 92, spillover: 4, completed: 90 },
  { name: "Sprint 21", velocity: 65, planned: 80, spillover: 22, completed: 65 },
];

const avgVelocity = Math.round(sprints.reduce((a, s) => a + s.velocity, 0) / sprints.length);
const avgSpillover = Math.round(sprints.reduce((a, s) => a + s.spillover, 0) / sprints.length);
const bestSprint = sprints.reduce((a, s) => (s.velocity > a.velocity ? s : a)).name;

export default function Sprints() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Sprint Tracker</h2>
        <p className="text-sm text-muted-foreground">Sprint velocity and spillover analysis</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Avg Velocity" value={avgVelocity} icon={Zap} variant="success" />
        <StatCard title="Avg Spillover" value={`${avgSpillover}%`} icon={AlertTriangle} variant="warning" />
        <StatCard title="Best Sprint" value={bestSprint} icon={Trophy} variant="accent" />
        <StatCard title="Total Sprints" value={sprints.length} icon={Hash} variant="default" />
      </div>

      <div className="space-y-4">
        {sprints.map((s) => (
          <div key={s.name} className="gradient-card border border-border rounded-lg p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">{s.name}</h3>
              <span className="font-mono text-xs text-muted-foreground">
                {s.completed} / {s.planned} pts
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Velocity</span>
                  <span className="font-mono">{s.velocity}</span>
                </div>
                <ProgressBar value={s.velocity} max={100} variant="success" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Spillover</span>
                  <span className="font-mono">{s.spillover}%</span>
                </div>
                <ProgressBar value={s.spillover} max={30} variant={s.spillover > 15 ? "danger" : s.spillover > 10 ? "warning" : "success"} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
