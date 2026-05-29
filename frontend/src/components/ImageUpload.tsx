import { useState } from "react";
import { base64ToDataUrl, fileToBase64 } from "@/api/client";
import type { WorkflowStep } from "@/types/api";

interface ImageUploadProps {
  onImageSelected: (base64: string, previewUrl: string) => void;
  step: WorkflowStep;
}

export function ImageUpload({ onImageSelected, step }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const dataUrl = base64ToDataUrl(base64, file.type || "image/jpeg");
      setPreviewUrl(dataUrl);
      onImageSelected(base64, dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read image");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">1. Upload a comic page</h2>
        <p className="text-sm text-slate-600">
          Pick a JPG or PNG. We convert it to base64 in the browser before sending it to the API.
        </p>
      </div>

      <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
        Choose image
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </label>

      {isLoading && <p className="text-sm text-slate-600">Reading file…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {previewUrl && step === "upload" && (
        <img
          src={previewUrl}
          alt="Uploaded comic preview"
          className="max-h-96 w-full rounded-lg border border-slate-200 object-contain"
        />
      )}
    </section>
  );
}
