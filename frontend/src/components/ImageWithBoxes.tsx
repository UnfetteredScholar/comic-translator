import { useCallback, useEffect, useRef, useState } from "react";
import {
  boundsToDisplayRect,
  getDisplayMetrics,
  type DisplayMetrics,
  type ImageBounds,
  type ResizeHandle,
} from "@/lib/imageCoordinates";
import { useImageBoxInteraction } from "@/hooks/useImageBoxInteraction";

export type { ImageBounds } from "@/lib/imageCoordinates";

export interface ImageOverlayBox<T = unknown> {
  id: string;
  bounds: ImageBounds;
  label?: string;
  strokeColor?: string;
  fillColor?: string | null;
  data?: T;
}

export interface ImageWithBoxesProps<T = unknown> {
  src: string;
  alt?: string;
  boxes: ImageOverlayBox<T>[];
  className?: string;
  imageClassName?: string;
  interactive?: boolean;
  selectedBoxId?: string | null;
  onSelectBox?: (id: string | null) => void;
  onBoxBoundsChange?: (id: string, bounds: ImageBounds) => void;
  onImageDimensions?: (width: number, height: number) => void;
}

const DEFAULT_STROKE = "#22c55e";
const SELECTED_STROKE = "#2563eb";

const RESIZE_HANDLES: {
  handle: ResizeHandle;
  className: string;
  cursor: string;
}[] = [
  { handle: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize" },
  { handle: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "ns-resize" },
  { handle: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "nesw-resize" },
  { handle: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
  { handle: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize" },
  { handle: "s", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", cursor: "ns-resize" },
  { handle: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize" },
  { handle: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
];

export function ImageWithBoxes<T = unknown>({
  src,
  alt = "",
  boxes,
  className = "",
  imageClassName = "",
  interactive = false,
  selectedBoxId = null,
  onSelectBox,
  onBoxBoundsChange,
  onImageDimensions,
}: ImageWithBoxesProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [metrics, setMetrics] = useState<DisplayMetrics | null>(null);

  const refreshMetrics = useCallback(() => {
    const img = imgRef.current;
    if (img && img.naturalWidth > 0) {
      setMetrics(getDisplayMetrics(img));
      onImageDimensions?.(img.naturalWidth, img.naturalHeight);
    }
  }, [onImageDimensions]);

  const handleBoundsChange = useCallback(
    (id: string, bounds: ImageBounds) => {
      onBoxBoundsChange?.(id, bounds);
    },
    [onBoxBoundsChange],
  );

  const { startInteraction } = useImageBoxInteraction({
    imgRef,
    onBoundsChange: handleBoundsChange,
  });

  useEffect(() => {
    refreshMetrics();
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(refreshMetrics);
    observer.observe(container);
    window.addEventListener("resize", refreshMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", refreshMetrics);
    };
  }, [refreshMetrics, src]);

  const handleOverlayPointerDown = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget) {
      onSelectBox?.(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`.trim()}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`block w-full rounded-lg border border-slate-200 object-contain ${imageClassName}`.trim()}
        onLoad={refreshMetrics}
        draggable={false}
      />

      {metrics && (
        <div
          className={`absolute inset-0 ${interactive ? "" : "pointer-events-none"}`}
          onPointerDown={interactive ? handleOverlayPointerDown : undefined}
          aria-hidden={!interactive}
        >
          {boxes.map((box) => {
            const { x, y, w, h } = boundsToDisplayRect(box.bounds, metrics);
            const isSelected = interactive && selectedBoxId === box.id;
            const stroke = isSelected
              ? SELECTED_STROKE
              : (box.strokeColor ?? DEFAULT_STROKE);
            const fill =
              box.fillColor != null && box.fillColor !== ""
                ? `${box.fillColor}55`
                : undefined;

            return (
              <div
                key={box.id}
                className="absolute touch-none"
                style={{
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  border: `2px solid ${stroke}`,
                  backgroundColor: fill,
                  cursor: interactive ? "move" : undefined,
                }}
                onPointerDown={
                  interactive
                    ? (e) => {
                        onSelectBox?.(box.id);
                        startInteraction(e, box.id, "move", box.bounds);
                      }
                    : undefined
                }
              >
                {box.label && (
                  <span
                    className="pointer-events-none absolute -top-5 left-0 max-w-full truncate text-xs font-medium"
                    style={{ color: stroke }}
                  >
                    {box.label}
                  </span>
                )}

                {isSelected &&
                  RESIZE_HANDLES.map(({ handle, className: handleClass, cursor }) => (
                    <span
                      key={handle}
                      role="presentation"
                      className={`absolute z-10 h-2.5 w-2.5 rounded-sm border border-white bg-blue-600 shadow ${handleClass}`}
                      style={{ cursor }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onSelectBox?.(box.id);
                        startInteraction(e, box.id, "resize", box.bounds, handle);
                      }}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
