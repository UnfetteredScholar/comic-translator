import { extractText } from "@/api/client";
import type { DetectedTextBox, ExtractedTextBox } from "@/types/api";
import { useState } from "react";

interface OCRButtonProps {
  imageBase64: string;
  detectedBoxes: DetectedTextBox[];
  onOCR: (textBoxes: ExtractedTextBox[]) => void;
}

export function OCRButton({ imageBase64, detectedBoxes, onOCR }: OCRButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedBoxes, setExtractedBoxes] = useState<ExtractedTextBox[]>([]);

  async function handleOCR() {
    setIsLoading(true);
    setError(null);

    try {
      if (!imageBase64) {
        throw new Error("No image base64 provided");
      }
      const textBoxes = await extractText(imageBase64, detectedBoxes);
      setExtractedBoxes(textBoxes);
      onOCR(textBoxes);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to extract text");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button onClick={handleOCR} disabled={isLoading} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
      {isLoading ? "Extracting text..." : "Extract Text"}
      {error && <p className="text-red-500">{error}</p>}
      {extractedBoxes.length > 0 && <p>Extracted {extractedBoxes.length} text boxes</p>}
    </button>
  );
}