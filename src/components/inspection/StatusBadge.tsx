import { cn, classForStatus, statusLabel } from "@/lib/utils";
import type { InspectionStatus } from "@/types";

export function StatusBadge({ status, className }: { status: InspectionStatus; className?: string }) {
  return (
    <span className={cn("badge", classForStatus(status), className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-success": status === "completed",
        "bg-primary animate-pulse": ["initiated", "in_progress", "uploading"].includes(status),
        "bg-destructive": status === "failed",
        "bg-muted-foreground": status === "draft",
      })} />
      {statusLabel(status)}
    </span>
  );
}
