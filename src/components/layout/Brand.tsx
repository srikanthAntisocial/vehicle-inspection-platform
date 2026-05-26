"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "AutoVision Inspect";

export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/dashboard" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary via-accent to-primary text-primary-foreground shadow-[0_0_24px_-4px_hsl(var(--primary)/0.65)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M3 13l2-5a2 2 0 011.9-1.4h10.2A2 2 0 0119 8l2 5M5 13h14M5 13v4a1 1 0 001 1h2a1 1 0 001-1v-1h6v1a1 1 0 001 1h2a1 1 0 001-1v-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="13.5" r="1" fill="currentColor" />
          <circle cx="16.5" cy="13.5" r="1" fill="currentColor" />
        </svg>
      </span>
      {!compact && (
        <span className="text-display text-lg font-semibold tracking-tight">
          {BRAND_NAME}
        </span>
      )}
    </Link>
  );
}
