"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Info, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/inspection/StatusBadge";
import { ImageUploadCard } from "@/components/inspection/ImageUploadCard";
import { useToast } from "@/components/ui/toast";
import { api, describeError } from "@/lib/api";
import { VEHICLE_ANGLES } from "@/types";
import type { InspectionDetail, UploadedImage } from "@/types";

const REQUIREMENTS = [
  "Landscape orientation",
  "Minimum 1920×1080 (Full HD)",
  "JPG, JPEG, or PNG only",
  "Entire vehicle in frame",
  "No motion blur or excessive shadows",
  "Bright, even lighting",
];

export default function UploadInspectionPage() {
  const params = useParams<{ id: string }>();
  const inspectionId = Number(params.id);
  const router = useRouter();
  const toast = useToast();

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<InspectionDetail>(`/inspections/${inspectionId}`)
      .then(({ data }) => alive && setInspection(data))
      .catch((err) => alive && setError(describeError(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [inspectionId]);

  const byAngle = useMemo(() => {
    const m = new Map<string, UploadedImage>();
    inspection?.uploaded_images.forEach((img) => m.set(img.angle, img));
    return m;
  }, [inspection]);

  const completed = byAngle.size;
  const required = VEHICLE_ANGLES.length;
  const allUploaded = completed === required;
  const editable =
    inspection && (inspection.status === "draft" || inspection.status === "failed");

  const onImageUpdated = (image: UploadedImage | null, angle: string) => {
    setInspection((prev) => {
      if (!prev) return prev;
      const without = prev.uploaded_images.filter((i) => i.angle !== angle);
      return { ...prev, uploaded_images: image ? [...without, image] : without };
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post<InspectionDetail>(`/inspections/${inspectionId}/submit`);
      toast.push("success", "Submitted to AI engine", "Awaiting processing callback.");
      router.push(`/inspections/${data.id}`);
    } catch (err) {
      toast.push("error", "Submission failed", describeError(err));
    } finally {
      setSubmitting(false);
    }
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

  const exteriorAngles = VEHICLE_ANGLES.filter((a) => a.group === "exterior");
  const detailAngles = VEHICLE_ANGLES.filter((a) => a.group === "details");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/inspections" className="hover:text-foreground">
          Inspections
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/inspections/${inspection.id}`} className="hover:text-foreground">
          {inspection.ref_num}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Upload</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Step 2 of 3</p>
          <h1 className="text-display mt-1 text-3xl font-semibold md:text-4xl">
            Capture vehicle photos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload or capture all 11 required angles. Files are validated locally before being saved.
          </p>
        </div>
        <StatusBadge status={inspection.status} />
      </header>

      <section className="card-surface grid gap-6 p-6 md:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Progress</h2>
            <span className="text-sm text-muted-foreground">
              {completed} of {required} angles
            </span>
          </div>
          <Progress value={(completed / required) * 100} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Reference</p>
              <p className="font-mono">{inspection.ref_num}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Vehicle</p>
              <p>{inspection.vehicle_number}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p>{inspection.customer_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Model</p>
              <p>{inspection.vehicle_model}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background/40 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4 text-accent" /> Standard operating procedure
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {REQUIREMENTS.map((r) => (
              <li key={r} className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {!editable && (
        <div className="rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
          This inspection has already been submitted to the AI engine. Photos are read-only.
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-display text-xl font-semibold">Exterior angles</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {exteriorAngles.map((angle) => (
            <ImageUploadCard
              key={angle.slug}
              inspectionId={inspection.id}
              angle={angle.slug}
              label={angle.label}
              existing={byAngle.get(angle.slug)}
              disabled={!editable}
              onUpdated={onImageUpdated}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-display text-xl font-semibold">Documentation</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {detailAngles.map((angle) => (
            <ImageUploadCard
              key={angle.slug}
              inspectionId={inspection.id}
              angle={angle.slug}
              label={angle.label}
              existing={byAngle.get(angle.slug)}
              disabled={!editable}
              onUpdated={onImageUpdated}
            />
          ))}
        </div>
      </section>

      <footer className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-4 backdrop-blur">
        <div className="text-sm text-muted-foreground">
          {allUploaded ? (
            <span className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" /> All angles captured — ready to submit.
            </span>
          ) : (
            <span>
              {required - completed} angle{required - completed === 1 ? "" : "s"} remaining.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/inspections/${inspection.id}`}>Save & exit</Link>
          </Button>
          <Button onClick={submit} disabled={!editable || !allUploaded || submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit for AI assessment
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
