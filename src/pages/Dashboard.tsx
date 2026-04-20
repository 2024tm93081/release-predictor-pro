import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { Package, Activity, Bug, Brain } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";

type StatusType = "Ready" | "At Risk" | "Not Ready";

interface DashboardSummary {
  current_release: string;
  target_date: string;
  readiness_score: number;
  readiness_delta: number;
  open_critical_bugs: number;
  ml_model_accuracy: number;
  model_subtitle: string;
}

interface ReadinessTrendItem {
  name: string;
  score: number;
  status: StatusType;
}

interface VelocityTrendItem {
  name: string;
  velocity: number;
}

interface RecentRelease {
  id: string;
  status: StatusType;
  date: string;
  readiness: number;
  coverage: number;
  bugs: number;
}

interface TopFeature {
  name: string;
  score: number;
}

interface DashboardResponse {
  success: boolean;
  summary: DashboardSummary;
  readiness_trend: ReadinessTrendItem[];
  velocity_trend: VelocityTrendItem[];
  recent_releases: RecentRelease[];
  blocking_factors: string[];
  top_features: TopFeature[];
}

const barColors: Record<string, string> = {
  Ready: "hsl(160, 100%, 45%)",
  "At Risk": "hsl(36, 91%, 55%)",
  "Not Ready": "hsl(350, 100%, 65%)",
};

function formatDate(dateValue?: string) {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFeatureName(name: string) {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const ChartTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground">{payload[0].payload.name}</p>
        <p className="text-sm font-mono font-bold text-foreground">
          {payload[0].value}
          {typeof payload[0].value === "number" && payload[0].dataKey === "score" ? "%" : " pts"}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [readinessData, setReadinessData] = useState<ReadinessTrendItem[]>([]);
  const [velocityData, setVelocityData] = useState<VelocityTrendItem[]>([]);
  const [releases, setReleases] = useState<RecentRelease[]>([]);
  const [blockingFactors, setBlockingFactors] = useState<string[]>([]);
  const [topFeatures, setTopFeatures] = useState<TopFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://127.0.0.1:5000/api/dashboard");
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard: ${response.status}`);
      }

      const result: DashboardResponse = await response.json();

      setSummary(result.summary);
      setReadinessData(result.readiness_trend || []);
      setVelocityData(result.velocity_trend || []);
      setReleases(result.recent_releases || []);
      setBlockingFactors(result.blocking_factors || []);
      setTopFeatures(result.top_features || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Release Pulse Dashboard</h2>
      </div>

      {loading && (
        <div className="gradient-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      )}

      {error && (
        <div className="gradient-card border border-destructive/30 rounded-lg p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Current Release"
              value={summary.current_release}
              icon={Package}
              variant="accent"
              subtitle={`Target: ${formatDate(summary.target_date)}`}
            />
            <StatCard
              title="Readiness Score"
              value={`${summary.readiness_score}%`}
              icon={Activity}
              variant="success"
              subtitle={`${summary.readiness_delta >= 0 ? "↑" : "↓"} ${Math.abs(summary.readiness_delta)}% from last release`}
            />
            <StatCard
              title="Open Critical Bugs"
              value={`${summary.open_critical_bugs}`}
              icon={Bug}
              variant="warning"
              subtitle="Threshold: 0"
            />
            <StatCard
              title="Model Performance"
              value={`${summary.ml_model_accuracy}%`}
              icon={Brain}
              variant="accent"
              subtitle={summary.model_subtitle}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="gradient-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Why This Release Is Risky</h3>

              {blockingFactors.length > 0 ? (
                <div className="space-y-3">
                  {blockingFactors.map((factor, index) => (
                    <div
                      key={index}
                      className="rounded-md border border-border bg-secondary/20 px-3 py-2 text-sm text-foreground"
                    >
                      {factor}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-border bg-secondary/20 px-3 py-4 text-sm text-muted-foreground">
                  No blocking factors for the current release.
                </div>
              )}
            </div>

            <div className="gradient-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Top 3 Prediction Drivers</h3>

              <div className="space-y-4">
                {topFeatures.map((feature, index) => (
                  <div key={feature.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">
                        {index + 1}. {formatFeatureName(feature.name)}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {feature.score}%
                      </span>
                    </div>
                    <ProgressBar value={feature.score} max={25} variant="success" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="gradient-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Release Readiness Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={readinessData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
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
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: "3 3" }} />
                  <Line
                    type="monotone"
                    dataKey="velocity"
                    stroke="hsl(263, 86%, 76%)"
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(263, 86%, 76%)", r: 5 }}
                    activeDot={{ r: 7, strokeWidth: 2 }}
                  />
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
                      <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{r.id}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 w-36">
                        <ProgressBar
                          value={r.readiness}
                          variant={
                            r.status === "Ready"
                              ? "success"
                              : r.status === "At Risk"
                              ? "warning"
                              : "danger"
                          }
                          showLabel
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{r.coverage}%</td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{r.bugs}</td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-accent hover:text-accent/80 font-medium transition-colors">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}