import { useState } from "react";
import { HealthBanner } from "@/components/HealthBanner";
import { ImageUpload } from "@/components/ImageUpload";
import { StepProgress } from "@/components/StepProgress";
import { DetectButton } from "@/components/DetectButton";
import type { WorkflowStep } from "@/types/api";
import type {DetectedTextBox} from "@/types/api";
import { ImageWorkspace } from "@/components/ImageWorkspace";

function App() {
  const [step, setStep] = useState<WorkflowStep>("upload");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textBoxes, setTextBoxes] = useState<DetectedTextBox[]>([]);

  function handleImageSelected(base64: string, dataUrl: string) {
    setImageBase64(base64);
    setPreviewUrl(dataUrl);
    setStep("detect");
  }

  async function handleDetect(textBoxes: DetectedTextBox[]) {
    setTextBoxes(textBoxes);
    setStep("extract");
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
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-700">
          <p>
            Image loaded ({Math.round(imageBase64.length / 1024)} KB).
          </p>
        </section>
      )}

      {step === "detect" && (
        <section className="space-y-4">
          <DetectButton imageBase64={imageBase64 ?? ""} onDetect={handleDetect} />
        </section>
      )}

      {step === "extract" && (
        <section className="space-y-4">
          <ImageWorkspace imageUrl={previewUrl ?? ""} textBoxes={textBoxes} />
        </section>
      )}
    </div>
  );


}

export default App;
