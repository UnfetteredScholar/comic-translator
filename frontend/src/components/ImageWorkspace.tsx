import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageWithBoxes } from "@/components/ImageWithBoxes";
import { BoxPropertyEditor } from "@/components/BoxPropertyEditor";
import type { ImageBounds } from "@/lib/imageCoordinates";
import {
  createDefaultWorkspaceBox,
  toWorkspaceBoxes,
  type WorkspaceTextBox,
} from "@/lib/workspaceBoxes";

export type { WorkspaceTextBox } from "@/lib/workspaceBoxes";

interface ImageWorkspaceProps {
  imageUrl: string;
  textBoxes: WorkspaceTextBox[];
  onTextBoxesChange?: (boxes: WorkspaceTextBox[]) => void;
}

export function ImageWorkspace({
  imageUrl,
  textBoxes,
  onTextBoxesChange,
}: ImageWorkspaceProps) {
  const [boxes, setBoxes] = useState<WorkspaceTextBox[]>(() =>
    toWorkspaceBoxes(textBoxes),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const next = toWorkspaceBoxes(textBoxes);
    setBoxes(next);
    setSelectedId((id) =>
      id && next.some((box) => box.id === id) ? id : null,
    );
  }, [textBoxes]);

  const updateBoxes = useCallback(
    (next: WorkspaceTextBox[]) => {
      setBoxes(next);
      onTextBoxesChange?.(next);
    },
    [onTextBoxesChange],
  );

  const overlayBoxes = useMemo(
    () =>
      boxes.map((box) => ({
        id: box.id,
        bounds: box.box,
        label: box.label,
        fillColor: box.fill_color_hex,
      })),
    [boxes],
  );

  const selectedBox = boxes.find((box) => box.id === selectedId) ?? null;

  const handleBoundsChange = (id: string, bounds: ImageBounds) => {
    updateBoxes(
      boxes.map((box) => (box.id === id ? { ...box, box: bounds } : box)),
    );
  };

  const handlePropertyChange = (
    patch: Partial<Pick<WorkspaceTextBox, "text" | "fill_color_hex">>,
  ) => {
    if (!selectedId) return;
    updateBoxes(
      boxes.map((box) => (box.id === selectedId ? { ...box, ...patch } : box)),
    );
  };

  const handleAddBox = () => {
    if (!imageSize) return;
    const newBox = createDefaultWorkspaceBox(imageSize.width, imageSize.height);
    updateBoxes([...boxes, newBox]);
    setSelectedId(newBox.id);
  };

  const handleDeleteBox = () => {
    if (!selectedId) return;
    const next = boxes.filter((box) => box.id !== selectedId);
    updateBoxes(next);
    setSelectedId(null);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleAddBox}
          disabled={!imageSize}
        >
          Add box
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleDeleteBox}
          disabled={!selectedId}
        >
          Delete selected
        </button>
        <span className="text-xs text-slate-500">
          {boxes.length} box{boxes.length === 1 ? "" : "es"}
        </span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <ImageWithBoxes
            src={imageUrl}
            alt="Uploaded comic preview"
            boxes={overlayBoxes}
            imageClassName="max-h-[32rem]"
            interactive
            selectedBoxId={selectedId}
            onSelectBox={setSelectedId}
            onBoxBoundsChange={handleBoundsChange}
            onImageDimensions={(width, height) =>
              setImageSize({ width, height })
            }
          />
          <p className="mt-2 text-xs text-slate-500">
            Click a box to select it. Drag to move, use handles to resize.
          </p>
        </div>

        {selectedBox && (
          <BoxPropertyEditor
            box={{
              label: selectedBox.label,
              score: selectedBox.score,
              text: selectedBox.text,
              fill_color_hex: selectedBox.fill_color_hex,
            }}
            onChange={handlePropertyChange}
            onDelete={handleDeleteBox}
          />
        )}
      </div>
    </section>
  );
}
