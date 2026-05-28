/** Bounding box in natural (source) image pixels: [x0, y0, x1, y1]. */
export type ImageBounds = [number, number, number, number];

export interface DisplayMetrics {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function getDisplayMetrics(img: HTMLImageElement): DisplayMetrics {
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

export function boundsToDisplayRect(
  bounds: ImageBounds,
  metrics: DisplayMetrics,
) {
  const [x0, y0, x1, y1] = bounds;
  const { scale, offsetX, offsetY } = metrics;
  return {
    x: offsetX + x0 * scale,
    y: offsetY + y0 * scale,
    w: (x1 - x0) * scale,
    h: (y1 - y0) * scale,
  };
}

export function displayDeltaToNatural(
  dx: number,
  dy: number,
  metrics: DisplayMetrics,
) {
  return { dx: dx / metrics.scale, dy: dy / metrics.scale };
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const MIN_BOX_SIZE = 8;

export function clampBounds(
  bounds: ImageBounds,
  maxW: number,
  maxH: number,
  minSize = MIN_BOX_SIZE,
): ImageBounds {
  let [x0, y0, x1, y1] = bounds;
  if (x1 < x0) [x0, x1] = [x1, x0];
  if (y1 < y0) [y0, y1] = [y1, y0];

  let w = x1 - x0;
  let h = y1 - y0;
  if (w < minSize) x1 = x0 + minSize;
  if (h < minSize) y1 = y0 + minSize;
  w = x1 - x0;
  h = y1 - y0;

  if (x0 < 0) {
    x1 -= x0;
    x0 = 0;
  }
  if (y0 < 0) {
    y1 -= y0;
    y0 = 0;
  }
  if (x1 > maxW) {
    x0 -= x1 - maxW;
    x1 = maxW;
  }
  if (y1 > maxH) {
    y0 -= y1 - maxH;
    y1 = maxH;
  }

  x0 = Math.max(0, x0);
  y0 = Math.max(0, y0);
  x1 = Math.min(maxW, Math.max(x1, x0 + minSize));
  y1 = Math.min(maxH, Math.max(y1, y0 + minSize));

  return [x0, y0, x1, y1];
}

export function moveBounds(
  bounds: ImageBounds,
  dx: number,
  dy: number,
  maxW: number,
  maxH: number,
): ImageBounds {
  const [x0, y0, x1, y1] = bounds;
  const w = x1 - x0;
  const h = y1 - y0;
  const nx0 = Math.max(0, Math.min(x0 + dx, maxW - w));
  const ny0 = Math.max(0, Math.min(y0 + dy, maxH - h));
  return [nx0, ny0, nx0 + w, ny0 + h];
}

export function resizeBounds(
  bounds: ImageBounds,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  maxW: number,
  maxH: number,
): ImageBounds {
  let [x0, y0, x1, y1] = bounds;

  if (handle.includes("w")) x0 += dx;
  if (handle.includes("e")) x1 += dx;
  if (handle.includes("n")) y0 += dy;
  if (handle.includes("s")) y1 += dy;

  return clampBounds([x0, y0, x1, y1], maxW, maxH);
}
