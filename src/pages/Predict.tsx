import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { Brain, Loader2, Check, X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

type StatusType = "Ready" | "At Risk" | "Not Ready";

const modelOptions = [
  { label: "🌳 Random Forest (Primary)", value: "Random Forest" },
  { label: "🚀 CatBoost (Comparison)", value: "CatBoost" },
  { label: "📋 Rule-Based Baseline", value: "Rule-Based" },
];

interface ReleaseOption {
  value: string;
  label: string;
}

interface BlockingFactor {
  name: string;
  current: string;
  required: string;
  pass: boolean;
}

interface PredictionResult {
  status: StatusType;
  confidence: number;
  probReady: number;
  probAtRisk: number;
  probNotReady: number;
  description: string;
  blockingFactors: BlockingFactor[];
}

interface FeatureImpactItem {
  feature: string;
  impact: number;
}

const ImpactTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    const val = payload[0].value;
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground">{payload[0].payload.feature}</p>
        <p className="text-sm font-mono font-bold text-foreground">
          {val > 0 ? "+" : ""}
          {(val * 100).toFixed(0)}%
        </p>
      </div>
    );
  }
  return null;
};

export default function Predict() {
  const [releaseOptions, setReleaseOptions] = useState<ReleaseOption[]>([]);
  const [release, setRelease] = useState("");
  const [model, setModel] = useState(modelOptions[0].value);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [featureImpact, setFeatureImpact] = useState<FeatureImpactItem[]>([]);
  const [manualInputs, setManualInputs] = useState({
    defectDensity: "0.3",
    testCoverage: "91",
    spilloverRatio: "8",
    codeChurn: "12",
    velocityVariance: "10",
    openCriticalBugs: "3",
    regressionPassRate: "94",
    sprintGoalsMet: "3",
    effortRatio: "1.05",
    daysSinceIncident: "55",
  });

  const isManual = release === "Manual Input";

  const inputClass =
    "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  const fetchReleaseOptions = async () => {
    try {
      setPageLoading(true);
      setError("");

      const response = await fetch("http://127.0.0.1:5000/api/releases");
      if (!response.ok) {
        throw new Error(`Failed to fetch releases: ${response.status}`);
      }

      const releases = await response.json();

      const mappedOptions: ReleaseOption[] = (releases || []).map((item: any) => ({
        value: item.release_id,
        label: item.release_id,
      }));

      mappedOptions.push({ value: "Manual Input", label: "Manual Input" });

      setReleaseOptions(mappedOptions);

      if (mappedOptions.length > 0) {
        const defaultRelease = mappedOptions[0].value;
        setRelease(defaultRelease);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load release options.");
    } finally {
      setPageLoading(false);
    }
  };

  const fetchImpact = async (releaseId: string) => {
    if (!releaseId || releaseId === "Manual Input") {
      setFeatureImpact([]);
      return;
    }

    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/predict-impact?release_id=${encodeURIComponent(releaseId)}`
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch impact: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        setFeatureImpact(data.impact || []);
      } else {
        setFeatureImpact([]);
      }
    } catch (err) {
      console.error(err);
      setFeatureImpact([]);
    }
  };

  useEffect(() => {
    fetchReleaseOptions();
  }, []);

  useEffect(() => {
    if (release && release !== "Manual Input") {
      fetchImpact(release);
    } else {
      setFeatureImpact([]);
    }
  }, [release]);

  const runPrediction = async () => {
    try {
      setLoading(true);
      setResult(null);
      setError("");

      if (release === "Manual Input") {
        const bugs = Number(manualInputs.openCriticalBugs);
        const coverage = Number(manualInputs.testCoverage);
        const score = Math.max(
          0,
          Math.min(100, Math.round(coverage * 0.7 + Math.max(0, 30 - bugs * 3)))
        );

        const status: StatusType =
          score >= 75 ? "Ready" : score >= 50 ? "At Risk" : "Not Ready";

        setResult({
          status,
          confidence: score,
          probReady: status === "Ready" ? score : 10,
          probAtRisk: status === "At Risk" ? score : 10,
          probNotReady: status === "Not Ready" ? score : 5,
          description: `${model} — simulated prediction`,
          blockingFactors: [
            {
              name: "Open Critical Bugs",
              current: manualInputs.openCriticalBugs,
              required: "0",
              pass: bugs === 0,
            },
            {
              name: "Test Coverage",
              current: `${manualInputs.testCoverage}%`,
              required: ">80%",
              pass: coverage > 80,
            },
          ],
        });

        setFeatureImpact([]);
        return;
      }

      const response = await fetch("http://127.0.0.1:5000/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          release_id: release,
          model,
        }),
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.status}`);
      }

      const data = await response.json();

      const mappedResult: PredictionResult = {
        status: data.status || data.prediction || "At Risk",
        confidence: Number(data.confidence ?? data.readiness ?? 0),
        probReady: Number(data.probReady ?? data.prob_ready ?? 0),
        probAtRisk: Number(data.probAtRisk ?? data.prob_at_risk ?? 0),
        probNotReady: Number(data.probNotReady ?? data.prob_not_ready ?? 0),
        description:
          data.description ||
          `${model} prediction for ${release}`,
        blockingFactors: (data.blockingFactors || data.blocking_factors || []).map((f: any) => ({
          name: f.name,
          current: String(f.current),
          required: String(f.required),
          pass: Boolean(f.pass),
        })),
      };

      setResult(mappedResult);

      if (release) {
        fetchImpact(release);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to run prediction.");
    } finally {
      setLoading(false);
    }
  };

  const sortedFeatureImpact = useMemo(() => {
    return [...featureImpact].sort((a, b) => a.impact - b.impact);
  }, [featureImpact]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Readiness Prediction</h2>
        <p className="text-sm text-muted-foreground">
          ML-powered release readiness analysis using Random Forest and CatBoost
        </p>
      </div>

      {pageLoading && (
        <div className="gradient-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          Loading prediction screen...
        </div>
      )}

      {error && (
        <div className="gradient-card border border-destructive/30 rounded-lg p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {!pageLoading && (
        <>
          <div className="gradient-card border border-border rounded-lg p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Select Release
                </label>
                <select
                  className={inputClass}
                  value={release}
                  onChange={(e) => {
                    setRelease(e.target.value);
                    setResult(null);
                  }}
                >
                  {releaseOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Select ML Model
                </label>
                <select
                  className={inputClass}
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setResult(null);
                  }}
                >
                  {modelOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={runPrediction}
                disabled={loading || !release}
                className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 uppercase tracking-wider glow-green"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {loading ? "Running..." : "Run Prediction"}
              </button>
            </div>

            {isManual && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4 pt-4 border-t border-border/50">
                {Object.entries(manualInputs).map(([key, val]) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground mb-1 block capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </label>
                    <input
                      className={inputClass}
                      value={val}
                      onChange={(e) =>
                        setManualInputs({
                          ...manualInputs,
                          [key]: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {result && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up">
              <div className="gradient-card border border-border rounded-lg p-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                  Prediction Result
                </p>
                <StatusBadge status={result.status} className="text-base px-4 py-1.5" />
                <p className="mt-3 font-mono text-4xl font-bold text-foreground">
                  {result.confidence}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.description}
                </p>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      Ready
                    </span>
                    <ProgressBar value={result.probReady} variant="success" />
                    <span className="font-mono text-xs text-foreground w-10">
                      {result.probReady}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      At Risk
                    </span>
                    <ProgressBar value={result.probAtRisk} variant="warning" />
                    <span className="font-mono text-xs text-foreground w-10">
                      {result.probAtRisk}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      Not Ready
                    </span>
                    <ProgressBar value={result.probNotReady} variant="danger" />
                    <span className="font-mono text-xs text-foreground w-10">
                      {result.probNotReady}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="gradient-card border border-border rounded-lg p-6">
                <h3 className="text-sm font-medium text-foreground mb-4">
                  Blocking Factors
                </h3>

                {result.blockingFactors.length > 0 &&
                result.blockingFactors.every((f) => f.pass) ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="h-5 w-5" />
                    <span className="text-sm">No blocking factors! Safe to release.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {result.blockingFactors
                      .filter((f) => !f.pass)
                      .map((f) => (
                        <div
                          key={f.name}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20"
                        >
                          <X className="h-4 w-4 text-destructive shrink-0" />
                          <div className="text-sm">
                            <span className="text-foreground">{f.name}</span>
                            <span className="text-muted-foreground ml-2">
                              Current: {f.current} | Required: {f.required}
                            </span>
                          </div>
                        </div>
                      ))}

                    {result.blockingFactors.filter((f) => f.pass).length > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground mt-3 mb-1">
                          Healthy Metrics
                        </p>
                        {result.blockingFactors
                          .filter((f) => f.pass)
                          .map((f) => (
                            <div
                              key={f.name}
                              className="flex items-center gap-2 text-xs text-primary"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>
                                {f.name}: {f.current}
                              </span>
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="gradient-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">
              Feature Impact on Prediction
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Green = positive impact, Red = negative impact
            </p>

            {isManual ? (
              <div className="text-sm text-muted-foreground py-10 text-center">
                Feature impact is shown for stored releases. Manual input prediction is supported for quick simulation.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sortedFeatureImpact} layout="vertical" barSize={18}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(225, 25%, 20%)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[-0.4, 0.4]}
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={150}
                  />
                  <Tooltip content={<ImpactTooltip />} cursor={{ fill: "hsl(225, 25%, 16%)" }} />
                  <ReferenceLine x={0} stroke="hsl(225, 25%, 25%)" />
                  <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                    {sortedFeatureImpact.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          entry.impact > 0
                            ? "hsl(160, 100%, 45%)"
                            : "hsl(350, 100%, 65%)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}