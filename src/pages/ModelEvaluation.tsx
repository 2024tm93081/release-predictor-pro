import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import {
  Award,
  Radio,
  Database,
  Timer,
  Brain,
  CheckCircle2,
  Check,
  X,
} from "lucide-react";
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
  rf_cv_std_f1?: number;
  rf_cv_std_f1_percent?: number;

  cb_cv_f1_percent: number;
  cb_cv_f1: number;
  cb_cv_std_f1?: number;
  cb_cv_std_f1_percent?: number;

  baseline_accuracy: number;
  baseline_f1: number;
}

interface DatasetSummary {
  total_records: number;
  train_records: number;
  test_records: number;
  test_size: number;
  validation_method: string;
  primary_metric: string;
  label_distribution: Record<string, number>;
}

interface ModelComparison {
  better_performer_by_cv_f1: string;
  selection_note: string;
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
    cv_mean_f1?: string;
    cv_std_f1?: string;
    training_time_seconds?: string | number;
    prediction_time_seconds?: string | number;
  };
  details: string[];
}

interface ClassificationMetric {
  precision: number;
  recall: number;
  "f1-score": number;
  support: number;
}

interface ClassificationReport {
  Ready?: ClassificationMetric;
  "At Risk"?: ClassificationMetric;
  "Not Ready"?: ClassificationMetric;
  accuracy?: number;
  "macro avg"?: ClassificationMetric;
  "weighted avg"?: ClassificationMetric;
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
  dataset?: DatasetSummary;
  model_comparison?: ModelComparison;
  model_cards: ModelCard[];
  comparison_chart: any[];
  rf_confusion: number[][];
  cb_confusion: number[][];
  rf_classification_report?: ClassificationReport;
  cb_classification_report?: ClassificationReport;
  prediction_history: PredictionHistoryItem[];
}

const labels = ["Ready", "At Risk", "Not Ready"];

const formatPercent = (value: number | string | undefined, decimals = 1) => {
  if (value === undefined || value === null || value === "") return "-";

  const num = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(num)) return "-";

  if (num <= 1) {
    return `${(num * 100).toFixed(decimals)}%`;
  }

  return `${num.toFixed(decimals)}%`;
};

const formatNumber = (value: number | string | undefined, decimals = 3) => {
  if (value === undefined || value === null || value === "") return "-";

  const num = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(num)) return String(value);

  return num.toFixed(decimals);
};

const formatSeconds = (value: string | number | undefined) => {
  if (value === undefined || value === null || value === "") return "-";

  const num = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(num)) return String(value);

  return `${num.toFixed(4)}s`;
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="gradient-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p
            key={p.name}
            className="text-xs font-mono"
            style={{ color: p.color }}
          >
            {p.name}: {p.value}%
          </p>
        ))}
      </div>
    );
  }

  return null;
};

function ConfusionMatrix({
  title,
  data,
}: {
  title: string;
  data: number[][];
}) {
  return (
    <div className="gradient-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-foreground mb-3">{title}</h3>

      <div className="mb-3 text-xs text-muted-foreground">
        Rows represent actual labels and columns represent predicted labels.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr>
              <th className="text-xs text-muted-foreground p-2"></th>
              {labels.map((label) => (
                <th
                  key={label}
                  className="text-xs text-muted-foreground p-2 font-mono"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {labels.map((rowLabel, i) => {
              const row = data?.[i] || [0, 0, 0];

              return (
                <tr key={rowLabel}>
                  <td className="text-xs text-muted-foreground p-2 font-mono text-left">
                    {rowLabel}
                  </td>

                  {labels.map((_, j) => {
                    const val = row?.[j] ?? 0;

                    return (
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
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DatasetSummaryCard({ dataset }: { dataset: DatasetSummary | null }) {
  if (!dataset) return null;

  return (
    <div className="gradient-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Dataset & Validation Setup
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Total Records</p>
          <p className="text-lg font-mono font-semibold text-foreground">
            {dataset.total_records}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Train Records</p>
          <p className="text-lg font-mono font-semibold text-foreground">
            {dataset.train_records}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Test Records</p>
          <p className="text-lg font-mono font-semibold text-foreground">
            {dataset.test_records}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Primary Metric</p>
          <p className="text-sm font-medium text-foreground">
            {dataset.primary_metric}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-secondary/30 border border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">
            Validation Method
          </p>
          <p className="text-sm text-foreground">
            {dataset.validation_method}
          </p>
        </div>

        <div className="rounded-lg bg-secondary/30 border border-border p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Label Distribution
          </p>

          <div className="flex flex-wrap gap-2">
            {Object.entries(dataset.label_distribution || {}).map(
              ([label, count]) => (
                <span
                  key={label}
                  className="text-xs px-2 py-1 rounded-full border border-border bg-background/40 text-muted-foreground"
                >
                  {label}:{" "}
                  <span className="font-mono text-foreground">{count}</span>
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// function FinalDecisionCard({
//   modelComparison,
// }: {
//   modelComparison: ModelComparison | null;
// }) {
//   if (!modelComparison) return null;

//   return (
//     <div className="gradient-card border border-primary/30 rounded-lg p-5">
//       {/* <div className="flex items-center gap-2 mb-3">
//         <Brain className="h-4 w-4 text-primary" />
//         <h3 className="text-sm font-semibold text-foreground">
//           Final Model Decision
//         </h3>
//       </div> */}

//       <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
//         <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
//           <p className="text-xs text-muted-foreground mb-1">
//             Better Performer by CV F1
//           </p>
//           <p className="text-xl font-semibold text-primary">
//             {modelComparison.better_performer_by_cv_f1}
//           </p>
//         </div>

//         <div className="rounded-lg bg-secondary/30 border border-border p-4">
//           <p className="text-xs text-muted-foreground mb-1">
//             Selection Interpretation
//           </p>
//           <p className="text-sm leading-relaxed text-foreground">
//             {modelComparison.selection_note}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

function ClassificationReportTable({
  title,
  report,
}: {
  title: string;
  report?: ClassificationReport;
}) {
  if (!report) return null;

  const rows = labels
    .map((label) => ({
      label,
      value: report[label as keyof ClassificationReport] as
        | ClassificationMetric
        | undefined,
    }))
    .filter((row) => row.value);

  if (!rows.length) return null;

  return (
    <div className="gradient-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Class-wise precision, recall and F1-score.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Class", "Precision", "Recall", "F1-Score", "Support"].map(
                (header) => (
                  <th
                    key={header}
                    className="text-left text-xs text-muted-foreground font-medium px-4 py-3"
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-foreground font-medium">
                  {row.label}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-foreground">
                  {formatNumber(row.value?.precision)}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-foreground">
                  {formatNumber(row.value?.recall)}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-foreground">
                  {formatNumber(row.value?.["f1-score"])}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-foreground">
                  {row.value?.support ?? "-"}
                </td>
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
  const [dataset, setDataset] = useState<DatasetSummary | null>(null);
  const [modelComparison, setModelComparison] =
    useState<ModelComparison | null>(null);
  const [modelCards, setModelCards] = useState<ModelCard[]>([]);
  const [compChart, setCompChart] = useState<any[]>([]);
  const [rfConfusion, setRfConfusion] = useState<number[][]>([]);
  const [cbConfusion, setCbConfusion] = useState<number[][]>([]);
  const [rfClassificationReport, setRfClassificationReport] =
    useState<ClassificationReport | undefined>();
  const [cbClassificationReport, setCbClassificationReport] =
    useState<ClassificationReport | undefined>();
  const [predictionHistory, setPredictionHistory] = useState<
    PredictionHistoryItem[]
  >([]);
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

      setTopMetrics(result.top_metrics || null);
      setDataset(result.dataset || null);
      setModelComparison(result.model_comparison || null);
      setModelCards(result.model_cards || []);
      setCompChart(result.comparison_chart || []);
      setRfConfusion(result.rf_confusion || []);
      setCbConfusion(result.cb_confusion || []);
      setRfClassificationReport(result.rf_classification_report);
      setCbClassificationReport(result.cb_classification_report);
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
          title: "RF CV F1",
          value: `${topMetrics.rf_cv_f1_percent}%`,
          icon: Award,
          variant: "success" as const,
          subtitle:
            topMetrics.rf_cv_std_f1_percent !== undefined
              ? `± ${topMetrics.rf_cv_std_f1_percent}% std`
              : "Cross-validation",
        },
        {
          title: "RF Score",
          value: `${topMetrics.rf_cv_f1}`,
          icon: Award,
          variant: "success" as const,
          subtitle:
            topMetrics.rf_cv_std_f1 !== undefined
              ? `Mean ± Std: ${topMetrics.rf_cv_f1} ± ${topMetrics.rf_cv_std_f1}`
              : "Random Forest",
        },
        {
          title: "CB CV F1",
          value: `${topMetrics.cb_cv_f1_percent}%`,
          icon: Award,
          variant: "accent" as const,
          subtitle:
            topMetrics.cb_cv_std_f1_percent !== undefined
              ? `± ${topMetrics.cb_cv_std_f1_percent}% std`
              : "Cross-validation",
        },
        {
          title: "CB Score",
          value: `${topMetrics.cb_cv_f1}`,
          icon: Award,
          variant: "accent" as const,
          subtitle:
            topMetrics.cb_cv_std_f1 !== undefined
              ? `Mean ± Std: ${topMetrics.cb_cv_f1} ± ${topMetrics.cb_cv_std_f1}`
              : "CatBoost",
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
        <h2 className="text-xl font-semibold text-foreground">
          Model Evaluation & Comparison
        </h2>
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
            {statCards.map((metric) => (
              <StatCard key={metric.title} {...metric} />
            ))}
          </div>

          <DatasetSummaryCard dataset={dataset} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
  {modelCards.map((modelCard) => {
    const isCatBoost = modelCard.name === "CatBoost";
    const isRandomForest = modelCard.name === "Random Forest";
    const isBaseline = modelCard.name === "Rule-Based Baseline";

    return (
      <div
        key={modelCard.name}
        className={`gradient-card rounded-xl p-5 border-2 shadow-lg transition-all ${
          isCatBoost
            ? "border-accent/80 glow-blue"
            : isRandomForest
            ? "border-primary/40"
            : "border-warning/40"
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {modelCard.name}
            </h3>

            <p className="text-xs text-muted-foreground mt-1">
              {isCatBoost
                ? "Advanced boosting model for higher predictive performance"
                : isRandomForest
                ? "Stable ensemble model for comparison"
                : "Manual checklist benchmark"}
            </p>
          </div>

          {isCatBoost && (
            <span className="shrink-0 text-xs px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/40 font-medium">
              Primary
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-secondary/30 border border-border p-3">
            <p className="text-xs text-muted-foreground">Test Accuracy</p>
            <p className="text-lg font-mono font-semibold text-foreground mt-1">
              {modelCard.metrics.test_accuracy}
            </p>
          </div>

          <div className="rounded-lg bg-secondary/30 border border-border p-3">
            <p className="text-xs text-muted-foreground">Test F1</p>
            <p className="text-lg font-mono font-semibold text-foreground mt-1">
              {modelCard.metrics.test_f1}
            </p>
          </div>

          <div className="rounded-lg bg-secondary/30 border border-border p-3">
            <p className="text-xs text-muted-foreground">Precision</p>
            <p className="text-sm font-mono font-semibold text-foreground mt-1">
              {modelCard.metrics.precision}
            </p>
          </div>

          <div className="rounded-lg bg-secondary/30 border border-border p-3">
            <p className="text-xs text-muted-foreground">Recall</p>
            <p className="text-sm font-mono font-semibold text-foreground mt-1">
              {modelCard.metrics.recall}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-background/40 border border-border p-3 mb-4">
          <p className="text-xs text-muted-foreground">Cross Validation F1</p>
          <p className="text-sm font-mono font-semibold text-foreground mt-1">
            {modelCard.metrics.cv_mean_f1 || modelCard.metrics.cv_f1}
            {modelCard.metrics.cv_std_f1 && (
              <span className="text-muted-foreground">
                {" "}
                ± {modelCard.metrics.cv_std_f1}
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-secondary/30 border border-border p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" />
              Train Time
            </div>
            <p className="text-sm font-mono font-semibold text-foreground mt-1">
              {formatSeconds(modelCard.metrics.training_time_seconds)}
            </p>
          </div>

          <div className="rounded-lg bg-secondary/30 border border-border p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" />
              Predict Time
            </div>
            <p className="text-sm font-mono font-semibold text-foreground mt-1">
              {formatSeconds(modelCard.metrics.prediction_time_seconds)}
            </p>
          </div>
        </div>

        <div className="space-y-1 pt-2 border-t border-border/60">
          {modelCard.details.map((detail, index) => (
            <p key={index} className="text-xs text-muted-foreground">
              {detail}
            </p>
          ))}
        </div>
      </div>
    );
  })}
</div>

          {/* <FinalDecisionCard modelComparison={modelComparison} /> */}

          <div className="gradient-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">
              Model Performance Comparison
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Test metrics compare one holdout split. CV F1 is used as the
              primary model comparison metric.
            </p>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={compChart} barGap={2} barSize={20}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(225, 25%, 20%)"
                  vertical={false}
                />

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
                  tickFormatter={(value: number) => `${value}%`}
                />

                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "hsl(225, 25%, 16%)" }}
                />

                <Legend
                  wrapperStyle={{
                    fontSize: 12,
                    color: "hsl(220, 15%, 55%)",
                  }}
                />

                <Bar
                  dataKey="Random Forest"
                  fill="hsl(160, 100%, 45%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="CatBoost"
                  fill="hsl(199, 89%, 60%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Rule-Based"
                  fill="hsl(220, 15%, 45%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConfusionMatrix
              title="Confusion Matrix — Random Forest"
              data={rfConfusion}
            />
            <ConfusionMatrix
              title="Confusion Matrix — CatBoost"
              data={cbConfusion}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ClassificationReportTable
              title="Classification Report — Random Forest"
              report={rfClassificationReport}
            />
            <ClassificationReportTable
              title="Classification Report — CatBoost"
              report={cbClassificationReport}
            />
          </div>

          <div className="gradient-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">
                Release Prediction History
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Historical prediction agreement against actual release outcome.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "Release",
                      "RF Prediction",
                      "CatBoost",
                      "Rule-Based",
                      "Actual",
                      "RF Match",
                      "CB Match",
                    ].map((header) => (
                      <th
                        key={header}
                        className="text-left text-xs text-muted-foreground font-medium px-4 py-3"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {predictionHistory.map((row) => (
                    <tr
                      key={row.release}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-foreground">
                        {row.release}
                      </td>

                      <td className="px-4 py-3 text-sm text-foreground">
                        {row.rf}
                      </td>

                      <td className="px-4 py-3 text-sm text-foreground">
                        {row.cb}
                      </td>

                      <td className="px-4 py-3 text-sm text-foreground">
                        {row.rb}
                      </td>

                      <td className="px-4 py-3 text-sm text-foreground">
                        {row.actual}
                      </td>

                      <td className="px-4 py-3">
                        {row.rfMatch ? (
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
                        {row.cbMatch ? (
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

                  {predictionHistory.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-sm text-muted-foreground text-center"
                      >
                        No prediction history available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* <div className="gradient-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Viva Explanation Point
              </h3>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Random Forest and CatBoost are compared using the same feature set,
              same stratified train-test split, and stratified cross-validation.
              Weighted F1-score is treated as the primary metric because release
              readiness is a three-class classification problem. Test metrics are
              shown for the holdout set, while CV mean and standard deviation are
              used to judge model stability.
            </p>
          </div> */}
        </>
      )}
    </div>
  );
}