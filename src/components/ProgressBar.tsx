import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
  showLabel?: boolean;
}

const barVariants = {
  default: "bg-accent",
  success: "bg-primary",
  warning: "bg-warning",
  danger: "bg-destructive",
};

export function ProgressBar({ value, max = 100, variant = "default", className, showLabel }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barVariants[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-xs font-mono text-muted-foreground w-10 text-right">{Math.round(pct)}%</span>}
    </div>
  );
}
