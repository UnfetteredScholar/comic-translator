import { useCallback, useRef } from "react";
import {
  displayDeltaToNatural,
  getDisplayMetrics,
  moveBounds,
  resizeBounds,
  type ImageBounds,
  type ResizeHandle,
} from "@/lib/imageCoordinates";

type InteractionMode = "move" | "resize";

interface InteractionState {
  boxId: string;
  mode: InteractionMode;
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
  startBounds: ImageBounds;
}

interface UseImageBoxInteractionOptions {
  imgRef: React.RefObject<HTMLImageElement | null>;
  onBoundsChange: (boxId: string, bounds: ImageBounds) => void;
}

export function useImageBoxInteraction({
  imgRef,
  onBoundsChange,
}: UseImageBoxInteractionOptions) {
  const interactionRef = useRef<InteractionState | null>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  const startInteraction = useCallback(
    (
      e: React.PointerEvent,
      boxId: string,
      mode: InteractionMode,
      startBounds: ImageBounds,
      handle?: ResizeHandle,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      interactionRef.current = {
        boxId,
        mode,
        handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startBounds,
      };

      const onPointerMove = (ev: PointerEvent) => {
        const interaction = interactionRef.current;
        const img = imgRef.current;
        if (!interaction || !img || img.naturalWidth === 0) return;

        const metrics = getDisplayMetrics(img);
        const { dx, dy } = displayDeltaToNatural(
          ev.clientX - interaction.startClientX,
          ev.clientY - interaction.startClientY,
          metrics,
        );

        const { naturalWidth, naturalHeight } = img;
        let next: ImageBounds;

        if (interaction.mode === "move") {
          next = moveBounds(
            interaction.startBounds,
            dx,
            dy,
            naturalWidth,
            naturalHeight,
          );
        } else if (interaction.handle) {
          next = resizeBounds(
            interaction.startBounds,
            interaction.handle,
            dx,
            dy,
            naturalWidth,
            naturalHeight,
          );
        } else {
          return;
        }

        onBoundsChangeRef.current(interaction.boxId, next);
      };

      const onPointerUp = () => {
        interactionRef.current = null;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [imgRef],
  );

  return { startInteraction };
}
