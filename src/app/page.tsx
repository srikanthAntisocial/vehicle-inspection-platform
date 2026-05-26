import Link from "next/link";
import { ArrowRight, Camera, Cpu, FileCheck2, ShieldCheck, Workflow } from "lucide-react";

import { Brand } from "@/components/layout/Brand";
import { Button } from "@/components/ui/button";

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "AutoVision Inspect";
const TAGLINE = process.env.NEXT_PUBLIC_BRAND_TAGLINE || "AI-powered vehicle damage intelligence";

const FEATURES = [
  {
    icon: Camera,
    title: "Guided capture",
    body: "Eleven-angle photo workflow with on-the-fly resolution, blur, and orientation checks before a single byte is sent upstream.",
  },
  {
    icon: Cpu,
    title: "Instant AI assessment",
    body: "Hand-off to our AI partner, then receive part-level damage findings, severity, and repair-or-replace verdicts back on the same record.",
  },
  {
    icon: FileCheck2,
    title: "Audit-ready reports",
    body: "Every inspection bundles uploaded images, ROI overlays, and timestamps - exportable for claims, refurb pipelines, and resale ops.",
  },
  {
    icon: ShieldCheck,
    title: "Signed webhooks",
    body: "Callbacks are verified with HMAC-SHA256 and persisted as immutable logs. No silent drops, no surprise edits.",
  },
];

export default function LandingPage() {
  return (
    <div className="grain min-h-screen">
      <header className="container flex h-16 items-center justify-between">
        <Brand />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="container relative mt-12 grid gap-12 pb-20 md:mt-24 md:grid-cols-[1.05fr_1fr] md:items-center">
        <div className="space-y-8">
          <span className="badge border-primary/30 bg-primary/10 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Production-grade inspection workflow
          </span>
          <h1 className="text-display text-balance text-5xl font-semibold leading-[1.05] md:text-6xl lg:text-7xl">
            Turn eleven photos into a defensible damage report.
          </h1>
          <p className="max-w-xl text-pretty text-lg text-muted-foreground">
            {TAGLINE}. {BRAND_NAME} guides every walk-around, validates the capture, sends it to the AI engine, and brings the verdict home — all under your brand.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Start an inspection
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how">See the flow</Link>
            </Button>
          </div>
          <dl className="grid grid-cols-3 gap-6 pt-6">
            <Stat label="Required angles" value="11" />
            <Stat label="Minimum resolution" value="1920×1080" />
            <Stat label="Status states tracked" value="6" />
          </dl>
        </div>

        <div className="relative">
          <div className="card-surface relative overflow-hidden p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
              <span>Inspection · #INS-2087</span>
              <span className="badge border-success/40 bg-success/15 text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Completed
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                "Front", "Front L", "Front R",
                "Left", "Rear", "Right",
                "Windshield", "VIN", "Odometer",
              ].map((label, i) => (
                <div
                  key={label}
                  className="aspect-square rounded-md border border-border bg-gradient-to-br from-secondary to-secondary/40 p-3"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                  <div className="mt-3 h-2 w-full rounded-full bg-primary/30">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${60 + i * 4}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2 rounded-lg border border-border bg-background/40 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Front bumper</span>
                <span className="font-medium text-warning">Repair · Moderate</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rear-left fender</span>
                <span className="font-medium text-destructive">Replace · Severe</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Windshield</span>
                <span className="font-medium text-success">No damage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="container pb-24">
        <div className="mb-10 flex items-end justify-between gap-6">
          <h2 className="text-display text-3xl font-semibold md:text-4xl">A single, verifiable pipeline.</h2>
          <Workflow className="hidden h-10 w-10 text-muted-foreground md:block" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card-surface p-6 transition-colors hover:border-primary/40">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container flex h-14 items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</span>
          <Link href="/login" className="hover:text-foreground">Sign in →</Link>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-display text-2xl font-semibold">{value}</dd>
    </div>
  );
}
