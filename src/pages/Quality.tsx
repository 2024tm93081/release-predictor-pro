import { StatCard } from "@/components/StatCard";
import { Shield, Bug, GitBranch, AlertCircle, Check, X } from "lucide-react";

const metrics = [
  { title: "Test Coverage", value: "91%", icon: Shield, variant: "success" as const },
  { title: "Defect Density", value: "0.3/KLOC", icon: Bug, variant: "success" as const },
  { title: "Code Churn", value: "12%", icon: GitBranch, variant: "warning" as const },
  { title: "Defect Leakage", value: "4%", icon: AlertCircle, variant: "warning" as const },
];

const gates = [
  { name: "Unit Test Coverage > 80%", passed: true },
  { name: "Integration Tests Passing", passed: true },
  { name: "No Critical Defects", passed: true },
  { name: "Performance Benchmarks Met", passed: true },
  { name: "Security Scan Cleared", passed: true },
  { name: "Code Review Completion", passed: false },
];

const passedCount = gates.filter((g) => g.passed).length;

export default function Quality() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Quality Metrics</h2>
        <p className="text-sm text-muted-foreground">Code quality and release gates</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <StatCard key={m.title} {...m} />
        ))}
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">Quality Gates</h3>
          <span className="text-xs font-mono text-muted-foreground">
            {passedCount}/{gates.length} passed
          </span>
        </div>
        <div className="space-y-3">
          {gates.map((g) => (
            <div
              key={g.name}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/30 border border-border/50"
            >
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
          ))}
        </div>
      </div>
    </div>
  );
}
