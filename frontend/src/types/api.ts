// Types that mirror backend/app/schema/image.py and health.py.
// Keeping them here for now; later you can auto-generate from OpenAPI.

export type HealthStatus = "healthy" | "unhealthy";

export interface HealthResponse {
  status: HealthStatus;
  message: string;
  version: string;
  timestamp: string;
}

export type TextBoxLabel = "bubble" | "text_bubble" | "text_free";

export interface DetectedTextBox {
  score: number;
  label: TextBoxLabel;
  box: [number, number, number, number]; // [x0, y0, x1, y1]
}

export interface ExtractedTextBox extends DetectedTextBox {
  text: string;
}

export interface TranslatedTextBox extends ExtractedTextBox {
  translated_text: string;
}

export interface FillTextBox extends TranslatedTextBox {
  fill_color_hex?: string | null;
  font_color_hex?: string | null;
}

export type WorkflowStep =
  | "upload"
  | "detect"
  | "extract"
  | "translate"
  | "review"
  | "done";

  export type Font =
  | "Atkinson Hyperlegible Mono Regular"
  | "Atkinson Hyperlegible Next Regular"
  | "Atkinson Hyperlegible Regular"
  | "Coolvetica Regular"
  | "Noto Sans Regular";