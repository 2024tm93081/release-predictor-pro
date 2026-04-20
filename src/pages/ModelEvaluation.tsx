import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { Award, Radio } from "lucide-react";
import { Check, X } from "lucide-react";
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

interface TopMetrics {
  rf_cv_f1_percent: number;
  rf_cv_f1: number;
  cb_cv_f1_percent: number;
  cb_cv_f1: number;
  baseline_accuracy: number;
  baseline_f1: number;
}

interface ModelCard {
  name: string;
  badge: string | null;
  winner: boolean;
  metrics: {
    test_accuracy: string;
    test_f1: string;
    precision: string;
    recall: string;
    cv_f1: string;
  };
  details: string[];
}

interface PredictionHistoryItem {
  release: string;
  rf: string;
  cb: string;
  rb: string;
  actual: string;
  rfMatch: boolean;
  cbMatch: boolean;
}

interface ModelEvaluationResponse {
  success: boolean;
  top_metrics: TopMetrics;
  model_cards: ModelCard[];
  comparison_chart: any[];
  rf_confusion: number[][];
  cb_confusion: number[][];
  prediction_history: PredictionHistoryItem[];
}

const labels = ["Ready", "At Risk", "Not Ready"];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs font-mono" style={{ color: p.color }}>
            {p.name}: {p.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function ConfusionMatrix({ title, data }: { title: string; data: number[][] }) {
  return (
    <div className="gradient-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-foreground mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr>
              <th className="text-xs text-muted-foreground p-2"></th>
              {labels.map((l) => (
                <th key={l} className="text-xs text-muted-foreground p-2 font-mono">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td className="text-xs text-muted-foreground p-2 font-mono text-left">
                  {labels[i]}
                </td>
                {row.map((val, j) => (
                  <td
                    key={j}
                    className={`p-2 font-mono text-sm font-bold rounded ${
                      i === j
                        ? "bg-primary/15 text-primary"
                        : val > 0
                        ? "bg-destructive/10 text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ModelEvaluation() {
  const [topMetrics, setTopMetrics] = useState<TopMetrics | null>(null);
  const [modelCards, setModelCards] = useState<ModelCard[]>([]);
  const [compChart, setCompChart] = useState<any[]>([]);
  const [rfConfusion, setRfConfusion] = useState<number[][]>([]);
  const [cbConfusion, setCbConfusion] = useState<number[][]>([]);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://127.0.0.1:5000/api/model-evaluation");
      if (!response.ok) {
        throw new Error(`Failed to fetch model evaluation: ${response.status}`);
      }

      const result: ModelEvaluationResponse = await response.json();

      setTopMetrics(result.top_metrics);
      setModelCards(result.model_cards || []);
      setCompChart(result.comparison_chart || []);
      setRfConfusion(result.rf_confusion || []);
      setCbConfusion(result.cb_confusion || []);
      setPredictionHistory(result.prediction_history || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load model evaluation data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluation();
  }, []);

  const statCards = topMetrics
    ? [
        {
          title: "RF CV F1 %",
          value: `${topMetrics.rf_cv_f1_percent}%`,
          icon: Award,
          variant: "success" as const,
          subtitle: "Cross-validation",
        },
        {
          title: "RF CV F1",
          value: `${topMetrics.rf_cv_f1}`,
          icon: Award,
          variant: "success" as const,
          subtitle: "Random Forest",
        },
        {
          title: "CB CV F1 %",
          value: `${topMetrics.cb_cv_f1_percent}%`,
          icon: Award,
          variant: "accent" as const,
          subtitle: "Cross-validation",
        },
        {
          title: "CB CV F1",
          value: `${topMetrics.cb_cv_f1}`,
          icon: Award,
          variant: "accent" as const,
          subtitle: "CatBoost",
        },
        {
          title: "Baseline Acc",
          value: `${topMetrics.baseline_accuracy}%`,
          icon: Radio,
          variant: "warning" as const,
          subtitle: "Rule-Based",
        },
        {
          title: "Baseline F1",
          value: `${topMetrics.baseline_f1}`,
          icon: Radio,
          variant: "warning" as const,
          subtitle: "Rule-Based",
        },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Model Evaluation & Comparison</h2>
        <p className="text-sm text-muted-foreground">
          Empirical comparison: Random Forest vs CatBoost vs Rule-Based Baseline
        </p>
      </div>

      {loading && (
        <div className="gradient-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          Loading model evaluation...
        </div>
      )}

      {error && (
        <div className="gradient-card border border-destructive/30 rounded-lg p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {statCards.map((m) => (
              <StatCard key={m.title} {...m} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {modelCards.map((mc) => (
              <div
                key={mc.name}
                className={`gradient-card border-2 ${
                  mc.winner
                    ? "border-warning glow-orange"
                    : mc.name === "CatBoost"
                    ? "border-accent glow-blue"
                    : "border-muted-foreground/30"
                } rounded-lg p-5`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">{mc.name}</h3>
                  {mc.badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                      {mc.badge}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Test Accuracy: </span>
                    <span className="font-mono text-foreground">{mc.metrics.test_accuracy}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">CV F1: </span>
                    <span className="font-mono text-foreground">{mc.metrics.cv_f1}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Test F1: </span>
                    <span className="font-mono text-foreground">{mc.metrics.test_f1}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Precision: </span>
                    <span className="font-mono text-foreground">{mc.metrics.precision}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Recall: </span>
                    <span className="font-mono text-foreground">{mc.metrics.recall}</span>
                  </div>
                </div>

                {mc.details.map((d, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {d}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="gradient-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Model Performance Comparison (Test Metrics)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={compChart} barGap={2} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 20%)" vertical={false} />
                <XAxis
                  dataKey="metric"
                  tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(225, 25%, 16%)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "hsl(220, 15%, 55%)" }} />
                <Bar dataKey="Random Forest" fill="hsl(160, 100%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CatBoost" fill="hsl(199, 89%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rule-Based" fill="hsl(220, 15%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConfusionMatrix title="Confusion Matrix — Random Forest" data={rfConfusion} />
            <ConfusionMatrix title="Confusion Matrix — CatBoost" data={cbConfusion} />
          </div>

          <div className="gradient-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">Release Prediction History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Release", "RF Prediction", "CatBoost", "Rule-Based", "Actual", "RF Match", "CB Match"].map((h) => (
                      <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {predictionHistory.map((r) => (
                    <tr key={r.release} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{r.release}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{r.rf}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{r.cb}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{r.rb}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{r.actual}</td>
                      <td className="px-4 py-3">
                        {r.rfMatch ? (
                          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-destructive/15 flex items-center justify-center">
                            <X className="h-3 w-3 text-destructive" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.cbMatch ? (
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
        </>
      )}
    </div>
  );
}