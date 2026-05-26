import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function classForStatus(status: string): string {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success border-success/40";
    case "in_progress":
    case "initiated":
    case "uploading":
      return "bg-primary/10 text-primary border-primary/40";
    case "failed":
      return "bg-destructive/10 text-destructive border-destructive/40";
    case "draft":
    default:
      return "bg-muted/40 text-muted-foreground border-border";
  }
}

export function statusLabel(status: string): string {
  return {
    draft: "Draft",
    uploading: "Uploading",
    initiated: "Initiated",
    in_progress: "In Progress",
    completed: "Completed",
    failed: "Failed",
  }[status] ?? status;
}
