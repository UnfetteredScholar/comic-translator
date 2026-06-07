import { replaceImageText } from "@/api/client";
import { type WorkspaceTextBox } from "@/lib/workspaceBoxes";
import type { Font, TranslatedTextBox } from "@/types/api";
import { useState } from "react";
import { toTranslatedTextBoxes } from "@/lib/workspaceBoxes";
interface ExportButtonProps {
  imageBase64: string;
  textBoxes: WorkspaceTextBox[];
  font: Font;
  onExport: (exportedImageBase64: string, exportedPreviewUrl: string) => void;
}

export function ExportButton({ imageBase64, textBoxes, font, onExport }: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportedImageBase64, setExportedImageBase64] = useState<string | null>(null);
  const [exportedPreviewUrl, setExportedPreviewUrl] = useState<string | null>(null);

  async function handleExport() {
    setIsLoading(true);
    setError(null);

    try {
      if (!imageBase64) {
        throw new Error("No image base64 provided");
      }

      if (!textBoxes) {
        throw new Error("No text boxes provided");
      }

      const { base64: exportedImageBase64, previewUrl: exportedPreviewUrl } = await replaceImageText(imageBase64, toTranslatedTextBoxes(textBoxes), "#FFFFFF", "#000000", font);
      setExportedImageBase64(exportedImageBase64);
      setExportedPreviewUrl(exportedPreviewUrl);
      onExport(exportedImageBase64, exportedPreviewUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to export image");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button onClick={handleExport} disabled={isLoading} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
      {isLoading ? "Exporting..." : "Export Image"}
      {error && <p className="text-red-500">{error}</p>}
      {exportedImageBase64 && <p>Exported image</p>}
    </button>
  );
}