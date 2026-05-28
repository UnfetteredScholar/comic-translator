import type { DetectedTextBox } from "@/types/api";
import type { ImageBounds } from "@/lib/imageCoordinates";

export type WorkspaceTextBox = DetectedTextBox & {
  id: string;
  text?: string;
  fill_color_hex?: string | null;
};

export function createBoxId(): string {
  return crypto.randomUUID();
}

/** Assign stable ids to boxes that do not already have one. */
export function toWorkspaceBoxes(
  boxes: (DetectedTextBox & Partial<Pick<WorkspaceTextBox, "id" | "text" | "fill_color_hex">>)[],
): WorkspaceTextBox[] {
  return boxes.map((box) => ({
    ...box,
    id: box.id ?? createBoxId(),
  }));
}

export function toDetectedTextBox(box: WorkspaceTextBox): DetectedTextBox {
  const { id: _id, text: _text, fill_color_hex: _fill, ...detected } = box;
  return detected;
}

export function toDetectedTextBoxes(boxes: WorkspaceTextBox[]): DetectedTextBox[] {
  return boxes.map(toDetectedTextBox);
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
