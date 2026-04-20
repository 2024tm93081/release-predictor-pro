import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import {
  Shield,
  Bug,
  GitBranch,
  Activity,
  AlertCircle,
  Timer,
  TrendingUp,
  Calendar,
  Check,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface QualityMetrics {
  release_id: string;
  test_coverage: number;
  defect_density: number;
  code_churn: number;
  regression_pass_rate: number;
  open_critical_bugs: number;
  velocity_variance: number;
  spillover_ratio: number;
  days_since_incident: number;
}

interface Gate {
  name: string;
  current: string;
  passed: boolean;
}

interface TrendItem {
  release: string;
  testCoverage: number;
  regressionPass: number;
  defectDensity: number;
}

interface QualityResponse {
  success: boolean;
  current_release: string | null;
  metrics: QualityMetrics;
  gates: Gate[];
  trend: TrendItem[];
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs font-mono" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Quality() {
  const [currentRelease, setCurrentRelease] = useState<string>("");
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [gates, setGates] = useState<Gate[]>([]);
  const [trendData, setTrendData] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchQuality = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://127.0.0.1:5000/api/quality");
      if (!response.ok) {
        throw new Error(`Failed to fetch quality data: ${response.status}`);
      }

      const result: QualityResponse = await response.json();

      setCurrentRelease(result.current_release || "");
      setMetrics(result.metrics || null);
      setGates(result.gates || []);
      setTrendData(result.trend || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load quality data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuality();
  }, []);

  const passedCount = gates.filter((g) => g.passed).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Quality Metrics</h2>
        <p className="text-sm text-muted-foreground">
          Code and testing health indicators
          {currentRelease ? ` · Showing ${currentRelease}` : ""}
        </p>
      </div>

      {loading && (
        <div className="gradient-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          Loading quality metrics...
        </div>
      )}

      {error && (
        <div className="gradient-card border border-destructive/30 rounded-lg p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && metrics && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Test Coverage" value={`${metrics.test_coverage}%`} icon={Shield} variant="success" />
            <StatCard title="Defect Density" value={`${metrics.defect_density}/KLOC`} icon={Bug} variant="success" />
            <StatCard title="Code Churn" value={`${metrics.code_churn}%`} icon={GitBranch} variant="success" />
            <StatCard title="Regression Pass" value={`${metrics.regression_pass_rate}%`} icon={Activity} variant="success" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Open Critical Bugs" value={`${metrics.open_critical_bugs}`} icon={AlertCircle} variant="warning" />
            <StatCard title="Velocity Variance" value={`${metrics.velocity_variance}%`} icon={TrendingUp} variant="success" />
            <StatCard title="Spillover Ratio" value={`${metrics.spillover_ratio}%`} icon={Timer} variant="success" />
            <StatCard title="Days Since Incident" value={`${metrics.days_since_incident}`} icon={Calendar} variant="success" />
          </div>

          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Release Quality Gates</h3>
                <p className="text-xs text-muted-foreground">
                  {passedCount}/{gates.length} gates passed
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {gates.map((g) => (
                <div
                  key={g.name}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    {g.passed ? (
                      <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-destructive/15 flex items-center justify-center">
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </div>
                    )}
                    <span className={`text-sm ${g.passed ? "text-foreground" : "text-muted-foreground"}`}>
                      {g.name}
                    </span>
                  </div>
                  <span className={`font-mono text-xs ${g.passed ? "text-primary" : "text-destructive"}`}>
                    Current: {g.current}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="gradient-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Quality Trends (Last 4 Releases)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" vertical={false} />
                <XAxis
                  dataKey="release"
                  tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: "3 3" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "hsl(220, 15%, 55%)" }} />
                <Line type="monotone" dataKey="testCoverage" stroke="hsl(160, 100%, 45%)" strokeWidth={2} dot={{ r: 4 }} name="Test Coverage" />
                <Line type="monotone" dataKey="regressionPass" stroke="hsl(199, 89%, 60%)" strokeWidth={2} dot={{ r: 4 }} name="Regression Pass" />
                <Line type="monotone" dataKey="defectDensity" stroke="hsl(350, 100%, 65%)" strokeWidth={2} dot={{ r: 4 }} name="Defect Density" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}