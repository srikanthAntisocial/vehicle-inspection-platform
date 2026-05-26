"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, CheckCircle2, Loader2, RefreshCcw, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AngleIllustration } from "./AngleIllustration";
import { api, describeError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { UploadedImage } from "@/types";

interface Props {
  inspectionId: number;
  angle: string;
  label: string;
  existing?: UploadedImage;
  disabled?: boolean;
  onUpdated: (image: UploadedImage | null, angle: string) => void;
}

const ALLOWED = ["image/jpeg", "image/jpg", "image/png"];
const MIN_W = 1920;
const MIN_H = 1080;

async function validateClientSide(file: File): Promise<string | null> {
  if (!ALLOWED.includes(file.type)) return "File must be JPG, JPEG, or PNG";
  if (file.size > 25 * 1024 * 1024) return "File exceeds 25MB";

  return await new Promise<string | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width < img.height) return resolve("Image must be in landscape orientation");
      if (img.width < MIN_W || img.height < MIN_H)
        return resolve(`Image must be at least ${MIN_W}×${MIN_H}`);
      resolve(null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("Image appears corrupt or unreadable");
    };
    img.src = url;
  });
}

export function ImageUploadCard({ inspectionId, angle, label, existing, disabled, onUpdated }: Props) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const upload = async (file: File) => {
    setError(null);
    const validationError = await validateClientSide(file);
    if (validationError) {
      setError(validationError);
      toast.push("error", "Image rejected", validationError);
      return;
    }

    const form = new FormData();
    form.append("angle", angle);
    form.append("file", file);

    setProgress(0);
    try {
      const { data } = await api.post<UploadedImage>(
        `/inspections/${inspectionId}/images`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
          },
        },
      );
      onUpdated(data, angle);
      toast.push("success", `${label} uploaded`);
    } catch (err) {
      const message = describeError(err);
      setError(message);
      toast.push("error", `Upload failed for ${label}`, message);
    } finally {
      setProgress(null);
    }
  };

  const onFile = (file: File | undefined | null) => {
    if (file) void upload(file);
  };

  const remove = async () => {
    if (!existing) return;
    try {
      await api.delete(`/inspections/${inspectionId}/images/${existing.id}`);
      onUpdated(null, angle);
      toast.push("info", `${label} removed`);
    } catch (err) {
      toast.push("error", "Could not remove image", describeError(err));
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        onFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "card-surface group relative flex flex-col overflow-hidden transition-all",
        dragging && "border-primary ring-2 ring-primary/40",
        existing && "border-success/40",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-secondary text-muted-foreground">
            <AngleIllustration angle={angle} className="h-5 w-5" />
          </span>
          <span>{label}</span>
        </div>
        {existing ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <span className="text-xs text-muted-foreground">Required</span>
        )}
      </div>

      <div className="relative aspect-[16/9] w-full bg-secondary/40">
        {existing ? (
          <Image
            src={existing.public_url}
            alt={label}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <AngleIllustration angle={angle} className="h-12 w-20 opacity-50" />
            <p className="text-xs">Drop file or use the buttons below</p>
          </div>
        )}

        {progress !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="w-3/4">
              <Progress value={progress} />
            </div>
            <p className="text-xs text-muted-foreground">Uploading {progress}%</p>
          </div>
        )}
      </div>

      {error && (
        <p className="px-4 pt-2 text-xs text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-2 p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={disabled || progress !== null}
          onClick={() => inputRef.current?.click()}
        >
          {existing ? <RefreshCcw className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
          {existing ? "Replace" : "Upload"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={disabled || progress !== null}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          Camera
        </Button>
        {existing && !disabled && (
          <Button type="button" variant="ghost" size="icon" onClick={remove} aria-label="Remove image">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
