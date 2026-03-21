import { Check, AlertTriangle, X } from "lucide-react";

export default function About() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">About Release Pulse</h2>
        <p className="text-sm text-muted-foreground">Data-Driven Release Readiness Prediction for Agile Software Products</p>
      </div>

      <div className="gradient-card border border-border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
            <div className="h-6 w-6 rounded-full bg-accent animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Release Pulse</h3>
            <p className="text-sm text-muted-foreground">M.Tech Dissertation Project</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-6 text-sm">
          {[
            ["Student", "Bhargavi Manapuram"],
            ["BITS ID", "2024TM93081"],
            ["Programme", "M.Tech Software Engineering"],
            ["Institution", "BITS Pilani (WILP)"],
            ["Supervisor", "Venkatesh Jalla"],
            ["Examiner", "Sri Krishna Akula"],
            ["Organization", "Enmovil Solutions, Hyderabad"],
            ["Year", "2025–2026"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="text-muted-foreground min-w-[100px]">{label}:</span>
              <span className="text-foreground font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="gradient-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">ML Models Used</h3>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/30 border border-primary/20">
              <div className="flex items-center gap-2 mb-2"><span className="text-base">🌳</span><span className="text-sm font-semibold text-foreground">Random Forest (Primary)</span></div>
              <ul className="text-xs text-muted-foreground space-y-1 pl-6">
                <li>100 decision trees</li><li>Bootstrap sampling</li><li>Majority voting</li><li>F1-Score: <span className="font-mono text-primary">0.94</span></li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-accent/20">
              <div className="flex items-center gap-2 mb-2"><span className="text-base">🚀</span><span className="text-sm font-semibold text-foreground">CatBoost (Comparison)</span></div>
              <ul className="text-xs text-muted-foreground space-y-1 pl-6">
                <li>100 sequential trees</li><li>Error correction learning</li><li>Categorical support</li><li>F1-Score: <span className="font-mono text-accent">0.92</span></li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-2 mb-2"><span className="text-base">📋</span><span className="text-sm font-semibold text-foreground">Rule-Based Baseline</span></div>
              <ul className="text-xs text-muted-foreground space-y-1 pl-6">
                <li>Fixed thresholds</li><li>Manual checklist</li><li>F1-Score: <span className="font-mono text-warning">0.59</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="gradient-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">10 Features Used</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Quality Metrics</p>
              <ul className="text-sm text-foreground space-y-1.5">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Defect Density</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Test Coverage</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Open Critical Bugs</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Regression Pass Rate</li>
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Delivery Metrics</p>
              <ul className="text-sm text-foreground space-y-1.5">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Spillover Ratio</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Velocity Variance</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Sprint Goals Met</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Effort Ratio</li>
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Process Metrics</p>
              <ul className="text-sm text-foreground space-y-1.5">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Code Churn</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Days Since Incident</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="gradient-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">3-Class Classification Output</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold text-primary uppercase">Ready</span>
            </div>
            <p className="text-xs text-muted-foreground">All metrics within thresholds</p>
            <p className="text-xs text-muted-foreground">Safe to release to production</p>
          </div>
          <div className="p-4 rounded-lg border-2 border-warning/30 bg-warning/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm font-bold text-warning uppercase">At Risk</span>
            </div>
            <p className="text-xs text-muted-foreground">Some metrics failing</p>
            <p className="text-xs text-muted-foreground">Review blocking factors first</p>
          </div>
          <div className="p-4 rounded-lg border-2 border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 mb-2">
              <X className="h-5 w-5 text-destructive" />
              <span className="text-sm font-bold text-destructive uppercase">Not Ready</span>
            </div>
            <p className="text-xs text-muted-foreground">Critical metrics failing</p>
            <p className="text-xs text-muted-foreground">Do not release — fix issues first</p>
          </div>
        </div>
      </div>
    </div>
  );
}
