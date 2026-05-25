import { extractTextRegions } from "@/api/client";
import type { DetectedTextBox } from "@/types/api";
import { useState } from "react";

interface DetectButtonProps {
  imageBase64: string;
  onDetect: (textBoxes: DetectedTextBox[]) => void;
}

export function DetectButton({ imageBase64, onDetect }: DetectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedTextBox[]>([]);

  async function handleDetect() {
    setIsLoading(true);
    setError(null);

    try {
      if (!imageBase64) {
        throw new Error("No image base64 provided");
      }
      const textBoxes = await extractTextRegions(imageBase64);
      setDetectedBoxes(textBoxes);
      onDetect(textBoxes);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to detect text");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button onClick={handleDetect} disabled={isLoading} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
      {isLoading ? "Detecting..." : "Detect Text"}
      {error && <p className="text-red-500">{error}</p>}
      {detectedBoxes.length > 0 && <p>Detected {detectedBoxes.length} text boxes</p>}
    </button>
  );
}