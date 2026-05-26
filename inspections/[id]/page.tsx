"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/inspection/StatusBadge";
import { useToast } from "@/components/ui/toast";
import { api, describeError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { VEHICLE_ANGLES } from "@/types";
import type { Assessment, InspectionDetail } from "@/types";

function intensityVariant(intensity: string | null): "success" | "warning" | "destructive" | "default" {
  const v = (intensity || "").toLowerCase();
  if (["severe", "high", "critical"].some((k) => v.includes(k))) return "destructive";
  if (["moderate", "medium"].some((k) => v.includes(k))) return "warning";
  if (["minor", "low", "light", "none"].some((k) => v.includes(k))) return "success";
  return "default";
}

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const inspectionId = Number(params.id);
  const toast = useToast();

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data } = await api.get<InspectionDetail>(`/inspections/${inspectionId}`);
      setInspection(data);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll while processing
    const t = setInterval(() => {
      setInspection((current) => {
        if (current && ["uploading", "initiated", "in_progress"].includes(current.status)) {
          fetchData();
        }
        return current;
      });
    }, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectionId]);

  const angleLabel = useMemo(() => {
    const m = new Map<string, string>();
    VEHICLE_ANGLES.forEach((a) => m.set(a.slug, a.label));
    return m;
  }, []);

  const downloadReport = () => {
    if (!inspection) return;
    const payload = {
      ref_num: inspection.ref_num,
      vehicle_number: inspection.vehicle_number,
      customer_name: inspection.customer_name,
      vehicle_model: inspection.vehicle_model,
      status: inspection.status,
      created_at: inspection.created_at,
      completed_at: inspection.completed_at,
      assessments: inspection.assessments,
      reviewer_info: inspection.reviewer_info,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inspection.ref_num}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.push("success", "Report downloaded");
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading inspection…
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="mx-auto max-w-xl rounded-md border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        {error || "Inspection not found"}
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/inspections">
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const editable = inspection.status === "draft" || inspection.status === "failed";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/inspections" className="hover:text-foreground">Inspections</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{inspection.ref_num}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {inspection.vehicle_number} · {inspection.customer_name}
          </p>
          <h1 className="text-display mt-1 text-3xl font-semibold md:text-4xl">
            {inspection.vehicle_model}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge status={inspection.status} />
            <span>Reference {inspection.ref_num}</span>
            <span>· Created {formatDate(inspection.created_at)}</span>
            {inspection.completed_at && <span>· Completed {formatDate(inspection.completed_at)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {editable && (
            <Button size="sm" asChild>
              <Link href={`/inspections/${inspection.id}/upload`}>
                <Upload className="h-4 w-4" />
                Continue upload
              </Link>
            </Button>
          )}
          {inspection.status === "completed" && (
            <Button size="sm" variant="outline" onClick={downloadReport}>
              <Download className="h-4 w-4" />
              Download report
            </Button>
          )}
        </div>
      </header>

      {inspection.error_message && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>
            <p className="font-medium">Inspection error</p>
            <p className="opacity-90">{inspection.error_message}</p>
          </div>
        </div>
      )}

      <Timeline status={inspection.status} createdAt={inspection.created_at} completedAt={inspection.completed_at} />

      <Section title="Uploaded images" subtitle="Captured during the walk-around.">
        {inspection.uploaded_images.length === 0 ? (
          <Empty text="No images uploaded yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {inspection.uploaded_images
              .slice()
              .sort((a, b) => a.angle.localeCompare(b.angle))
              .map((img) => (
                <div key={img.id} className="card-surface overflow-hidden">
                  <div className="relative aspect-[16/9] bg-secondary">
                    <Image
                      src={img.public_url}
                      alt={img.angle}
                      fill
                      sizes="(max-width: 768px) 100vw, 320px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                    <span>{angleLabel.get(img.angle) || img.angle}</span>
                    <span className="font-mono text-muted-foreground">
                      {img.width}×{img.height}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Section>

      <Section title="ROI images" subtitle="Region-of-interest crops returned by the AI engine.">
        {inspection.roi_images.length === 0 ? (
          <Empty text="ROI images appear once processing completes." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {inspection.roi_images.map((img) => (
              <div key={img.id} className="card-surface overflow-hidden">
                <div className="relative aspect-[16/9] bg-secondary">
                  <Image
                    src={img.image_url}
                    alt={img.label || img.angle || "ROI"}
                    fill
                    sizes="(max-width: 768px) 100vw, 320px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="space-y-1 border-t border-border px-3 py-2 text-xs">
                  <p className="font-medium">{img.label || img.angle || "ROI"}</p>
                  {img.description && <p className="text-muted-foreground">{img.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Damage assessment" subtitle="Findings, severity and recommended action per part.">
        {inspection.assessments.length === 0 ? (
          <Empty
            text={
              inspection.status === "completed"
                ? "No damages detected. The vehicle is clean."
                : "Assessment will populate when the AI engine reports back."
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {inspection.assessments.map((a) => (
              <AssessmentCard key={a.id} assessment={a} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Timeline({ status, createdAt, completedAt }: { status: string; createdAt: string; completedAt: string | null }) {
  const steps = [
    { key: "draft", label: "Draft created", reached: true, ts: createdAt },
    { key: "uploading", label: "Uploading to AI engine", reached: ["uploading", "initiated", "in_progress", "completed", "failed"].includes(status) },
    { key: "initiated", label: "AI assessment initiated", reached: ["initiated", "in_progress", "completed", "failed"].includes(status) },
    { key: "in_progress", label: "Processing", reached: ["in_progress", "completed", "failed"].includes(status) },
    { key: "completed", label: status === "failed" ? "Failed" : "Completed", reached: ["completed", "failed"].includes(status), ts: completedAt || undefined },
  ];
  return (
    <section className="card-surface p-6">
      <h2 className="text-lg font-semibold">Timeline</h2>
      <ol className="mt-5 grid gap-4 md:grid-cols-5">
        {steps.map((step, idx) => (
          <li key={step.key} className="relative flex flex-col gap-2 md:items-center md:text-center">
            <div
              className={`grid h-8 w-8 place-items-center rounded-full border ${
                step.reached
                  ? step.key === "completed" && status === "failed"
                    ? "border-destructive bg-destructive/15 text-destructive"
                    : "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              <span className="text-xs font-semibold">{idx + 1}</span>
            </div>
            <div>
              <p className={`text-sm ${step.reached ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </p>
              {step.ts && <p className="text-xs text-muted-foreground">{formatDate(step.ts)}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-display text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="card-surface px-6 py-10 text-center text-sm text-muted-foreground">{text}</div>;
}

function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const variant = intensityVariant(assessment.intensity);
  const action = assessment.action?.toLowerCase();
  return (
    <article className="card-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{assessment.dam_type || "Damage"}</p>
          <h3 className="text-lg font-semibold">{assessment.part_name}</h3>
        </div>
        <Badge variant={variant}>{assessment.intensity || "—"}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={action === "replace" ? "destructive" : "default"}>
          {action === "replace" ? "Replace" : action ? "Repair" : "Action TBD"}
        </Badge>
        {typeof assessment.confidence === "number" && (
          <span className="text-xs text-muted-foreground">
            Confidence {(assessment.confidence * 100).toFixed(1)}%
          </span>
        )}
      </div>
      {assessment.pictures && assessment.pictures.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {assessment.pictures.slice(0, 6).map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-md bg-secondary">
              <Image src={url} alt="Damage" fill sizes="120px" className="object-cover" unoptimized />
              <span className="absolute inset-0 hidden items-center justify-center bg-background/60 group-hover:flex">
                <ExternalLink className="h-4 w-4" />
              </span>
            </a>
          ))}
        </div>
      )}
      {assessment.notes && <p className="mt-3 text-xs text-muted-foreground">{assessment.notes}</p>}
    </article>
  );
}
