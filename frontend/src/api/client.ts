import type {
  DetectedTextBox,
  ExtractedTextBox,
  HealthResponse,
  TranslatedTextBox,
} from "@/types/api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export function extractTextRegions(imageBase64: string): Promise<DetectedTextBox[]> {
  return request<DetectedTextBox[]>("/image/extract-text-regions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64 }),
  });
}

export function extractText(
  imageBase64: string,
  textBoxes: DetectedTextBox[],
): Promise<ExtractedTextBox[]> {
  return request<ExtractedTextBox[]>("/image/extract-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_data: imageBase64,
      text_boxes: textBoxes,
    }),
  });
}

export function translateTextList(
  textBoxes: ExtractedTextBox[],
  targetLanguage: string,
): Promise<TranslatedTextBox[]> {
  return request<TranslatedTextBox[]>("/image/translate-text-list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text_boxes: textBoxes,
      target_language: targetLanguage,
    }),
  });
}

export async function replaceImageText(
  imageBase64: string,
  textBoxes: TranslatedTextBox[],
  defaultFillHex: string = "#FFFFFF",
  defaultFontHex: string = "#000000",
): Promise<{ base64: string; previewUrl: string }> {
  const response = await fetch(`${API_BASE}/image/replace-image-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_data: imageBase64,
      text_boxes: textBoxes,
      default_fill_hex: defaultFillHex,
      default_font_hex: defaultFontHex,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || response.headers.get("Content-Type") || "image/jpeg";
  const base64 = await blobToBase64(blob);

  return { base64, previewUrl: base64ToDataUrl(base64, mimeType) };
}


export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function base64ToDataUrl(base64: string, mimeType = "image/jpeg"): string {
  return `data:${mimeType};base64,${base64}`;
}
