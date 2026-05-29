import type {
  DetectedTextBox,
  ExtractedTextBox,
  FillTextBox,
  TranslatedTextBox,
} from "@/types/api";
import type { ImageBounds } from "@/lib/imageCoordinates";

/** Fields added after detection; optional in the workspace until that pipeline step runs. */
type PipelineTextBoxFields = Partial<
  Omit<FillTextBox, keyof DetectedTextBox>
>;

/**
 * A text box through the full UI workflow. Accepts properties from any API stage
 * (`ExtractedTextBox`, `TranslatedTextBox`, `FillTextBox`) plus a stable `id`.
 */
export type WorkspaceTextBox = DetectedTextBox &
  PipelineTextBoxFields & {
    id: string;
  };

/** Input accepted by {@link toWorkspaceBoxes} — any pipeline stage, with or without `id`. */
export type WorkspaceTextBoxInput =
  | DetectedTextBox
  | ExtractedTextBox
  | TranslatedTextBox
  | FillTextBox
  | WorkspaceTextBox;

export function createBoxId(): string {
  return crypto.randomUUID();
}

/** Assign stable ids to boxes that do not already have one. */
export function toWorkspaceBoxes(boxes: WorkspaceTextBoxInput[]): WorkspaceTextBox[] {
  return boxes.map((box) => ({
    ...box,
    id: "id" in box && box.id ? box.id : createBoxId(),
  }));
}

export function toDetectedTextBox(box: WorkspaceTextBox): DetectedTextBox {
  const {
    id: _id,
    text: _text,
    translated_text: _translated,
    fill_color_hex: _fill,
    font_color_hex: _font,
    ...detected
  } = box;
  return detected;
}

export function toExtractedTextBox(box: WorkspaceTextBox): ExtractedTextBox {
  const {
    id: _id,
    translated_text: _translated,
    fill_color_hex: _fill,
    font_color_hex: _font,
    ...extracted
  } = box;
  return { ...extracted, text: box.text ?? "" };
}

export function toTranslatedTextBox(box: WorkspaceTextBox): TranslatedTextBox {
  const { id: _id, fill_color_hex: _fill, font_color_hex: _font, ...rest } = box;
  return {
    ...rest,
    text: box.text ?? "",
    translated_text: box.translated_text ?? "",
  };
}

export function toFillTextBox(box: WorkspaceTextBox): FillTextBox {
  const { id: _id, ...rest } = box;
  return {
    ...rest,
    text: box.text ?? "",
    translated_text: box.translated_text ?? "",
  };
}

export function toDetectedTextBoxes(boxes: WorkspaceTextBox[]): DetectedTextBox[] {
  return boxes.map(toDetectedTextBox);
}

export function toExtractedTextBoxes(boxes: WorkspaceTextBox[]): ExtractedTextBox[] {
  return boxes.map(toExtractedTextBox);
}

export function toTranslatedTextBoxes(boxes: WorkspaceTextBox[]): TranslatedTextBox[] {
  return boxes.map(toTranslatedTextBox);
}

const DEFAULT_BOX_FRACTION = 0.15;

export function defaultBoxBounds(
  imageWidth: number,
  imageHeight: number,
): ImageBounds {
  const size = Math.min(imageWidth, imageHeight) * DEFAULT_BOX_FRACTION;
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  const half = size / 2;
  return [
    Math.round(cx - half),
    Math.round(cy - half),
    Math.round(cx + half),
    Math.round(cy + half),
  ];
}

export function createDefaultWorkspaceBox(
  imageWidth: number,
  imageHeight: number,
): WorkspaceTextBox {
  return {
    id: createBoxId(),
    score: 1,
    label: "text_bubble",
    box: defaultBoxBounds(imageWidth, imageHeight),
    text: "",
    fill_color_hex: "#ffffff",
  };
}
