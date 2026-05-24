import { useState } from "react";
import { HealthBanner } from "@/components/HealthBanner";
import { ImageUpload } from "@/components/ImageUpload";
import { StepProgress } from "@/components/StepProgress";
import type { WorkflowStep } from "@/types/api";

function App() {
  const [step, setStep] = useState<WorkflowStep>("upload");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleImageSelected(base64: string, dataUrl: string) {
    setImageBase64(base64);
    setPreviewUrl(dataUrl);
    setStep("detect");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Comic Translator</h1>
        <p className="text-slate-600">
          Upload a page, detect speech bubbles, extract text, translate, and export.
        </p>
      </header>

      <HealthBanner />
      <StepProgress currentStep={step} />

      <ImageUpload onImageSelected={handleImageSelected} />

      {imageBase64 && previewUrl && step !== "upload" && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          <p>
            Image loaded ({Math.round(imageBase64.length / 1024)} KB as base64). Next up: call{" "}
            <code className="rounded bg-slate-100 px-1">/image/extract-text-regions</code> when you
            build step 2.
          </p>
        </section>
      )}
    </div>
  );
}

export default App;
