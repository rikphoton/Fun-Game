// NeonPulse Arcade - Display scaling.
// To keep games sharp on high-DPI screens the canvas backing store is scaled (up to MAX_RENDER_SCALE x)
// and the 2D context is scaled to match, so game code can use consistent logical coordinates.

export const LOGICAL_WIDTH = 800;
export const LOGICAL_HEIGHT = 600;
export const MAX_RENDER_SCALE = 2;

// How many backing pixels per logical pixel we want for a canvas shown `cssWidth` CSS pixels wide
// on a screen with the given devicePixelRatio. Snapped to quarter steps so tiny layout changes
// don't constantly resize the canvas.
export function computeRenderScale(cssWidth, dpr = 1, maxScale = MAX_RENDER_SCALE, logicalWidth = LOGICAL_WIDTH) {
  if (!Number.isFinite(cssWidth) || cssWidth <= 0) return 1;
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const baseW = Number.isFinite(logicalWidth) && logicalWidth > 0 ? logicalWidth : LOGICAL_WIDTH;
  const wanted = (cssWidth / baseW) * ratio;
  const snapped = Math.ceil(wanted * 4) / 4;
  return Math.max(1, Math.min(maxScale, snapped));
}

// Resizes the canvas backing store if needed and returns the scale to apply to the context.
export function fitCanvasToDisplay(
  canvas,
  dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
  logicalWidth = LOGICAL_WIDTH,
  logicalHeight = LOGICAL_HEIGHT
) {
  if (!canvas) return 1;
  const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: logicalWidth, height: logicalHeight };
  const widthToUse = rect && rect.width > 0 ? rect.width : logicalWidth;
  const scale = computeRenderScale(widthToUse, dpr, MAX_RENDER_SCALE, logicalWidth);
  const w = Math.round(logicalWidth * scale);
  const h = Math.round(logicalHeight * scale);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return scale;
}
