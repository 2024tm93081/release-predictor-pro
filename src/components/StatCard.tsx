import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  variant?: "default" | "success" | "warning" | "danger" | "accent";
  className?: string;
}

const variantStyles = {
  default: "border-border",
  success: "border-primary/30 glow-green",
  warning: "border-warning/30 glow-orange",
  danger: "border-destructive/30 glow-red",
  accent: "border-accent/30 glow-purple",
};

const iconVariantStyles = {
  default: "text-muted-foreground",
  success: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
  accent: "text-accent",
};

export function StatCard({ title, value, icon: Icon, subtitle, variant = "default", className }: StatCardProps) {
  return (
    <div className={cn("gradient-card rounded-lg border p-5 animate-slide-up", variantStyles[variant], className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn("p-2 rounded-lg bg-secondary/50", iconVariantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
