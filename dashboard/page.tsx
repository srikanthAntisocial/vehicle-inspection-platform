"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList, Loader2, PlusCircle, ShieldAlert, ShieldCheck, Sparkles, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/inspection/StatusBadge";
import { api, describeError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { DashboardStats } from "@/types";

const TILES = [
  { key: "total", label: "Total inspections", icon: ClipboardList, accent: "text-foreground" },
  { key: "draft", label: "Drafts", icon: Sparkles, accent: "text-muted-foreground" },
  { key: "initiated", label: "Initiated / Uploading", icon: Timer, accent: "text-primary" },
  { key: "in_progress", label: "In progress", icon: Loader2, accent: "text-accent" },
  { key: "completed", label: "Completed", icon: ShieldCheck, accent: "text-success" },
  { key: "failed", label: "Failed", icon: ShieldAlert, accent: "text-destructive" },
] as const;

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get<DashboardStats>("/dashboard/stats");
        if (alive) setStats(data);
      } catch (err) {
        if (alive) setError(describeError(err));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Overview</p>
          <h1 className="text-display mt-1 text-3xl font-semibold md:text-4xl">Inspection dashboard</h1>
        </div>
        <Button asChild>
          <Link href="/inspections/create">
            <PlusCircle className="h-4 w-4" />
            New inspection
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map(({ key, label, icon: Icon, accent }) => {
          const value = stats ? stats[key as keyof DashboardStats] : null;
          return (
            <div key={key} className="stat-tile">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon className={`h-4 w-4 ${accent}`} />
              </div>
              <p className="mt-3 text-display text-3xl font-semibold">
                {typeof value === "number" ? value : <span className="text-muted-foreground">—</span>}
              </p>
            </div>
          );
        })}
      </section>

      <section className="card-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Recent inspections</h2>
            <p className="text-sm text-muted-foreground">Latest submissions and drafts.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/inspections">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="divide-y divide-border">
          {stats?.recent.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No inspections yet. Start the first one to populate this view.
            </div>
          )}
          {stats?.recent.map((i) => (
            <Link
              key={i.id}
              href={`/inspections/${i.id}`}
              className="grid grid-cols-12 items-center gap-3 px-6 py-4 transition-colors hover:bg-secondary/40"
            >
              <div className="col-span-12 sm:col-span-4">
                <p className="font-medium">{i.vehicle_number}</p>
                <p className="text-xs text-muted-foreground">{i.vehicle_model}</p>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <p className="text-sm">{i.customer_name}</p>
                <p className="font-mono text-xs text-muted-foreground">{i.ref_num}</p>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <StatusBadge status={i.status} />
              </div>
              <div className="col-span-12 text-xs text-muted-foreground sm:col-span-2 sm:text-right">
                {formatDate(i.created_at)}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
