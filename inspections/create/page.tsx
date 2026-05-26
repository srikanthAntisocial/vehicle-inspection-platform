"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api, describeError } from "@/lib/api";
import type { Inspection } from "@/types";

const schema = z.object({
  ref_num: z
    .string()
    .min(1, "Reference number is required")
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, digits, hyphens, or underscores"),
  vehicle_number: z.string().min(1, "Vehicle number is required").max(64),
  customer_name: z.string().min(1, "Customer name is required").max(255),
  vehicle_model: z.string().min(1, "Vehicle model is required").max(255),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function CreateInspectionPage() {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ref_num: `INS-${Date.now().toString(36).toUpperCase()}`,
      vehicle_number: "",
      customer_name: "",
      vehicle_model: "",
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const { data } = await api.post<Inspection>("/inspections", {
        ...values,
        notes: values.notes?.trim() || null,
      });
      toast.push("success", "Inspection created", `Reference ${data.ref_num}`);
      router.push(`/inspections/${data.id}/upload`);
    } catch (err) {
      toast.push("error", "Could not create inspection", describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Step 1 of 3</p>
        <h1 className="text-display mt-1 text-3xl font-semibold md:text-4xl">New inspection</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Capture the basics. You can edit these details until the inspection is sent for AI assessment.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="card-surface space-y-6 p-6 md:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ref_num">Reference number</Label>
            <Input id="ref_num" {...form.register("ref_num")} placeholder="INS-001" />
            <p className="text-xs text-muted-foreground">
              Unique inspection ID. Sent to the AI engine as <code className="font-mono">ref_num</code>.
            </p>
            {form.formState.errors.ref_num && (
              <p className="text-xs text-destructive">{form.formState.errors.ref_num.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_number">Vehicle number</Label>
            <Input id="vehicle_number" {...form.register("vehicle_number")} placeholder="KA-01-AB-1234" />
            {form.formState.errors.vehicle_number && (
              <p className="text-xs text-destructive">{form.formState.errors.vehicle_number.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_name">Customer name</Label>
            <Input id="customer_name" {...form.register("customer_name")} placeholder="Jane Doe" />
            {form.formState.errors.customer_name && (
              <p className="text-xs text-destructive">{form.formState.errors.customer_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_model">Vehicle model</Label>
            <Input id="vehicle_model" {...form.register("vehicle_model")} placeholder="Toyota Corolla Altis 2021" />
            {form.formState.errors.vehicle_model && (
              <p className="text-xs text-destructive">{form.formState.errors.vehicle_model.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" rows={4} {...form.register("notes")} placeholder="Internal comments, claim numbers, ..." />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/inspections")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue to upload
          </Button>
        </div>
      </form>
    </div>
  );
}
