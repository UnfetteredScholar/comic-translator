import { translateTextList } from "@/api/client";
import type { TranslatedTextBox } from "@/types/api";
import { useState } from "react";
import { defaultLanguages, LanguageSelector } from "@/components/LanguageSelector";
import { toExtractedTextBoxes, type WorkspaceTextBox } from "@/lib/workspaceBoxes";

interface TranslateWorkspaceProps {
  extractedBoxes: WorkspaceTextBox[];
  // targetLanguage: string;
  onTranslate: (textBoxes: TranslatedTextBox[]) => void;
}

export function TranslateWorkspace({ extractedBoxes, onTranslate }: TranslateWorkspaceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedBoxes, setTranslatedBoxes] = useState<TranslatedTextBox[]>([]);
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null);

  async function handleTranslate() {
    setIsLoading(true);
    setError(null);

    try {
      if (!extractedBoxes) {
        throw new Error("No extracted boxes provided");
      }

      if (!targetLanguage) {
        throw new Error("No target language provided");
      }

      const textBoxes = await translateTextList(toExtractedTextBoxes(extractedBoxes), targetLanguage);
      setTranslatedBoxes(textBoxes);
      onTranslate(textBoxes);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to translate text");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <LanguageSelector
        value={targetLanguage ?? ""}
        onChange={(code) => setTargetLanguage(code)}
        languages={defaultLanguages}
      />
      {targetLanguage && <button onClick={handleTranslate} disabled={isLoading} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
        {isLoading ? "Translating text..." : "Translate Text"}
      </button>}
      {error && <p className="text-red-500">{error}</p>}
      {translatedBoxes.length > 0 && <p>Translated {translatedBoxes.length} text boxes</p>}
    </section>
  );
}