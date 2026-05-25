import type { DetectedTextBox } from "@/types/api";
import { useCallback, useEffect, useRef } from "react";

function getDisplayMetrics(img: HTMLImageElement) {
  const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
  const scale = Math.min(
    clientWidth / naturalWidth,
    clientHeight / naturalHeight,
  );
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  const offsetX = (clientWidth - width) / 2;
  const offsetY = (clientHeight - height) / 2;
  return { scale, offsetX, offsetY };
}

function boxToRect(
  box: [number, number, number, number],
  metrics: ReturnType<typeof getDisplayMetrics>,
) {
  const [x0, y0, x1, y1] = box;
  const { scale, offsetX, offsetY } = metrics;
  return {
    x: offsetX + x0 * scale,
    y: offsetY + y0 * scale,
    w: (x1 - x0) * scale,
    h: (y1 - y0) * scale,
  };
}

interface ImageWorkspaceProps {
  imageUrl: string;
  textBoxes: DetectedTextBox[];
}

export function ImageWorkspace({ imageUrl, textBoxes }: ImageWorkspaceProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawBoxes = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || img.naturalWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = img.clientWidth * dpr;
    canvas.height = img.clientHeight * dpr;
    canvas.style.width = `${img.clientWidth}px`;
    canvas.style.height = `${img.clientHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, img.clientWidth, img.clientHeight);

    const metrics = getDisplayMetrics(img);
    for (const { box, label } of textBoxes) {
      const { x, y, w, h } = boxToRect(box, metrics);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#22c55e";
      ctx.font = "12px sans-serif";
      ctx.fillText(label, x, Math.max(12, y - 4));
    }
  }, [textBoxes]);

  useEffect(() => {
    drawBoxes();
    window.addEventListener("resize", drawBoxes);
    return () => window.removeEventListener("resize", drawBoxes);
  }, [drawBoxes, imageUrl]);

  return (
    <section className="space-y-4">
      <div className="relative w-full max-h-96">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Uploaded comic preview"
          className="block max-h-96 w-full rounded-lg border border-slate-200 object-contain"
          onLoad={drawBoxes}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>
    </section>
  );
}
