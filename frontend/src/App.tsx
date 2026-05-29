import { useState } from "react";
import { HealthBanner } from "@/components/HealthBanner";
import { ImageUpload } from "@/components/ImageUpload";
import { StepProgress } from "@/components/StepProgress";
import { DetectButton } from "@/components/DetectButton";
import type { DetectedTextBox, ExtractedTextBox, TranslatedTextBox, WorkflowStep } from "@/types/api";
import { ImageWorkspace } from "@/components/ImageWorkspace";
import {
  toWorkspaceBoxes,
  type WorkspaceTextBox,
} from "@/lib/workspaceBoxes";
import { OCRButton } from "@/components/OCRButton";
import { TranslateWorkspace } from "@/components/TranslateWorkspace";
import { ExportButton } from "./components/ExportButton";

function App() {
  const [step, setStep] = useState<WorkflowStep>("upload");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textBoxes, setTextBoxes] = useState<WorkspaceTextBox[]>([]);
  const [exportedImageBase64, setExportedImageBase64] = useState<string | null>(null);
  const [exportedPreviewUrl, setExportedPreviewUrl] = useState<string | null>(null);


  function handleStepChange(nextStep: WorkflowStep) {
    if (nextStep === "detect" && !imageBase64) return;
    if (nextStep === "extract" && textBoxes.length === 0) return;
    if (nextStep === "translate") {
      if (textBoxes.length === 0) return;
      if (!textBoxes.every((box) => box.text?.trim())) return;
    }
    if (nextStep === "review") {
      if (textBoxes.length === 0) return;
      if (!textBoxes.every((box) => box.translated_text?.trim())) return;
    }
    if (nextStep === "done" && !exportedPreviewUrl) {
      alert("Please export image first");
      return;
    }
    setStep(nextStep);
  }

  function handleTextBoxesChange(boxes: WorkspaceTextBox[]) {
    setTextBoxes(boxes);
  }

  function handleImageSelected(base64: string, dataUrl: string) {
    setImageBase64(base64);
    setPreviewUrl(dataUrl);
    setStep("detect");
  }

  async function handleDetect(detected: DetectedTextBox[]) {
    setTextBoxes(toWorkspaceBoxes(detected));
    setStep("extract");
  }

  async function handleOCR(extracted: ExtractedTextBox[]) {
    setTextBoxes(toWorkspaceBoxes(extracted));
    setStep("translate");
  }

  async function handleTranslate(translated: TranslatedTextBox[]) {
    setTextBoxes(toWorkspaceBoxes(translated));
    setStep("review");
  }

  function handleExport(exportedImageBase64: string, exportedPreviewUrl: string) {
    setExportedImageBase64(exportedImageBase64);
    setExportedPreviewUrl(exportedPreviewUrl);
    setStep("done");
  }

  function handleDownload() {
    const link = document.createElement("a");
    link.href = exportedPreviewUrl ?? "";
    link.download = "exported.png";
    link.click();
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
      <StepProgress currentStep={step} setStep={handleStepChange} />

      {step === "upload" && (
      <ImageUpload onImageSelected={handleImageSelected} step={step} />
      )}

      {(step === "detect" || step === "extract" || step === "translate" || step === "review") && (
        <section className="space-y-4">
          <ImageWorkspace
            imageUrl={previewUrl ?? ""}
            textBoxes={textBoxes}
            onTextBoxesChange={handleTextBoxesChange}
          />
        </section>
      )}


      {(step === "detect" ) && (
        <section className="space-y-4">
          <DetectButton imageBase64={imageBase64 ?? ""} onDetect={handleDetect} />
        </section>
      )}

      {step === "extract" && (
        <section className="space-y-4">
          <OCRButton imageBase64={imageBase64 ?? ""} detectedBoxes={textBoxes} onOCR={handleOCR} />
        </section>
      )}

      {step === "translate" && (
        <section className="space-y-4">
          <TranslateWorkspace extractedBoxes={textBoxes} onTranslate={handleTranslate} />
        </section>
      )}

      {step === "review" && (
        <section className="space-y-4">
          <ExportButton imageBase64={imageBase64 ?? ""} textBoxes={textBoxes} onExport={handleExport} />
        </section>
      )}


      {exportedPreviewUrl && step === "done" && (
        <section className="space-y-4">
          <img src={exportedPreviewUrl} alt="Exported comic preview" className="max-h-96 w-full rounded-lg border border-slate-200 object-contain" />
          <button onClick={handleDownload} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Download</button>
        </section>
      )}


    </div>
  );


}

export default App;
