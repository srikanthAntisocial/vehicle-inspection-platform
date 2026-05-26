"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PlusCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/inspection/StatusBadge";
import { api, describeError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Inspection, InspectionListResponse, InspectionStatus } from "@/types";

const STATUSES: { value: InspectionStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "uploading", label: "Uploading" },
  { value: "initiated", label: "Initiated" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export default function InspectionsListPage() {
  const [items, setItems] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<InspectionStatus | "all">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (debounced) params.search = debounced;
    if (status !== "all") params.status = status;
    api
      .get<InspectionListResponse>("/inspections", { params })
      .then(({ data }) => {
        if (!alive) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err) => alive && setError(describeError(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, pageSize, debounced, status]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Records</p>
          <h1 className="text-display mt-1 text-3xl font-semibold md:text-4xl">Inspections</h1>
        </div>
        <Button asChild>
          <Link href="/inspections/create">
            <PlusCircle className="h-4 w-4" />
            New inspection
          </Link>
        </Button>
      </div>

      <div className="card-surface flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by ref, vehicle, customer..."
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as InspectionStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="card-surface overflow-hidden">
        <div className="grid grid-cols-12 gap-3 border-b border-border px-6 py-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="col-span-3">Vehicle</span>
          <span className="col-span-3">Customer / Ref</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-2">Created</span>
          <span className="col-span-2 text-right">Action</span>
        </div>
        <div className="divide-y divide-border">
          {loading && (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">Loading inspections…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No inspections match the current filters.
            </div>
          )}
          {!loading &&
            items.map((i) => (
              <div key={i.id} className="grid grid-cols-12 items-center gap-3 px-6 py-4">
                <div className="col-span-12 sm:col-span-3">
                  <p className="font-medium">{i.vehicle_number}</p>
                  <p className="text-xs text-muted-foreground">{i.vehicle_model}</p>
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <p className="text-sm">{i.customer_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{i.ref_num}</p>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <StatusBadge status={i.status} />
                </div>
                <div className="col-span-6 text-xs text-muted-foreground sm:col-span-2">
                  {formatDate(i.created_at)}
                </div>
                <div className="col-span-6 text-right sm:col-span-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/inspections/${i.id}`}>Open</Link>
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages} · {total} record{total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
