import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { Zap, AlertTriangle, Trophy, TrendingDown, Target } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type StatusType = "Ready" | "At Risk" | "Not Ready";

interface Sprint {
  completed_points: number;
  goals_met: number;
  planned_points: number;
  release_id: string;
  release_readiness_label: StatusType;
  release_target_date: string;
  spillover_ratio: number;
  sprint_end_date: string;
  sprint_name: string;
  sprint_order: number;
  sprint_start_date: string;
  status: StatusType;
  story_points: string;
  velocity: number;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs font-mono" style={{ color: p.color }}>
            {p.name}: {p.value} pts
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Sprints() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedRelease, setSelectedRelease] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSprints = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://127.0.0.1:5000/api/sprints");
      if (!response.ok) {
        throw new Error(`Failed to fetch sprints: ${response.status}`);
      }

      const result = await response.json();
      console.log("SPRINT API RESULT:", result);

      const sprintRows: Sprint[] = Array.isArray(result)
        ? result
        : result.data || [];

      setSprints(sprintRows);
    } catch (err) {
      console.error(err);
      setError("Failed to load sprint data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSprints();
  }, []);

  const releaseOptions = useMemo(() => {
    const releaseMap = new Map<string, string>();

    [...sprints]
      .sort((a, b) => b.release_target_date.localeCompare(a.release_target_date))
      .forEach((s) => {
        if (!releaseMap.has(s.release_id)) {
          releaseMap.set(s.release_id, s.release_target_date);
        }
      });

    return Array.from(releaseMap.entries()).map(([releaseId, targetDate]) => ({
      value: releaseId,
      label: `${releaseId} (${targetDate})`,
    }));
  }, [sprints]);

  useEffect(() => {
    if (!selectedRelease && releaseOptions.length > 0) {
      setSelectedRelease(releaseOptions[0].value);
    }
  }, [releaseOptions, selectedRelease]);

  const filteredSprints = useMemo(() => {
    if (!selectedRelease) return [];
    return [...sprints]
      .filter((s) => s.release_id === selectedRelease)
      .sort((a, b) => a.sprint_order - b.sprint_order);
  }, [sprints, selectedRelease]);

  const chartData = filteredSprints.map((s) => ({
    name: s.sprint_name,
    Planned: s.planned_points,
    Completed: s.completed_points,
  }));

  const avgVelocity = filteredSprints.length
    ? (
        filteredSprints.reduce((a, s) => a + s.velocity, 0) / filteredSprints.length
      ).toFixed(1)
    : "0.0";

  const avgSpillover = filteredSprints.length
    ? Math.round(
        filteredSprints.reduce((a, s) => a + s.spillover_ratio, 0) /
          filteredSprints.length
      )
    : 0;

  const bestSprint = filteredSprints.length
    ? filteredSprints.reduce((a, s) => (s.velocity > a.velocity ? s : a))
    : null;

  const worstSprint = filteredSprints.length
    ? filteredSprints.reduce((a, s) => (s.velocity < a.velocity ? s : a))
    : null;

  const avgGoal = filteredSprints.length
    ? (
        filteredSprints.reduce((a, s) => a + s.goals_met, 0) /
        filteredSprints.length
      ).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Sprint Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Delivery health and velocity tracking
          </p>
        </div>

        {!loading && !error && releaseOptions.length > 0 && (
          <div className="min-w-[240px]">
            <label className="text-xs text-muted-foreground mb-1 block">
              Select Release
            </label>
            <select
              value={selectedRelease}
              onChange={(e) => setSelectedRelease(e.target.value)}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {releaseOptions.map((release) => (
                <option key={release.value} value={release.value}>
                  {release.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div className="gradient-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          Loading sprint analytics...
        </div>
      )}

      {error && (
        <div className="gradient-card border border-destructive/30 rounded-lg p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && filteredSprints.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Avg Velocity" value={`${avgVelocity} pts`} icon={Zap} variant="success" />
            <StatCard title="Avg Spillover" value={`${avgSpillover}%`} icon={AlertTriangle} variant="warning" />
            <StatCard
              title="Best Sprint"
              value={bestSprint?.sprint_name || "N/A"}
              icon={Trophy}
              variant="accent"
              subtitle={bestSprint ? `${bestSprint.velocity} pts` : ""}
            />
            <StatCard
              title="Worst Sprint"
              value={worstSprint?.sprint_name || "N/A"}
              icon={TrendingDown}
              variant="danger"
              subtitle={worstSprint ? `${worstSprint.velocity} pts` : ""}
            />
            <StatCard title="Avg Goal Met" value={`${avgGoal} / 3`} icon={Target} variant="default" />
          </div>

          <div className="gradient-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">
              Sprint Comparison — Planned vs Completed
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barGap={4} barSize={28}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(225, 25%, 20%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{
                    fill: "hsl(220, 15%, 55%)",
                    fontSize: 11,
                    fontFamily: "JetBrains Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
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
                      <th
                        key={h}
                        className="text-left text-xs text-muted-foreground font-medium px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSprints.map((s) => (
                    <tr
                      key={`${s.release_id}-${s.sprint_name}`}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-foreground">
                        {s.sprint_name}
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {s.velocity} pts
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center gap-2">
                          <ProgressBar
                            value={s.spillover_ratio}
                            max={30}
                            variant={
                              s.spillover_ratio > 15
                                ? "danger"
                                : s.spillover_ratio > 10
                                ? "warning"
                                : "success"
                            }
                          />
                          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {s.spillover_ratio}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">
                        {s.goals_met}/3
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">
                        {s.completed_points}/{s.planned_points}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !error && filteredSprints.length === 0 && (
        <div className="gradient-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          No sprint data found.
        </div>
      )}
    </div>
  );
}