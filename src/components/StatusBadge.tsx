import { cn } from "@/lib/utils";

type StatusType = "Ready" | "At Risk" | "Not Ready";

const statusStyles: Record<StatusType, string> = {
  "Ready": "bg-primary/15 text-primary border-primary/30",
  "At Risk": "bg-warning/15 text-warning border-warning/30",
  "Not Ready": "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status, className }: { status: StatusType; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", statusStyles[status], className)}>
      {status}
    </span>
  );
}
