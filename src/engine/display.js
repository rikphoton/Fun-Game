// NeonPulse Arcade - Display scaling.
// The games draw in a fixed 800x600 logical space. To keep them sharp on high-DPI screens the
// canvas backing store is made larger (up to MAX_SCALE x) and the 2D context is scaled to match,
// so game code never has to know about it.

export const LOGICAL_WIDTH = 800;
export const LOGICAL_HEIGHT = 600;
export const MAX_RENDER_SCALE = 2;

// How many backing pixels per logical pixel we want for a canvas shown `cssWidth` CSS pixels wide
// on a screen with the given devicePixelRatio. Snapped to quarter steps so tiny layout changes
// (scrollbars, fullscreen toggles) don't constantly resize the canvas.
export function computeRenderScale(cssWidth, dpr = 1, maxScale = MAX_RENDER_SCALE) {
  if (!Number.isFinite(cssWidth) || cssWidth <= 0) return 1;
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const wanted = (cssWidth / LOGICAL_WIDTH) * ratio;
  const snapped = Math.ceil(wanted * 4) / 4;
  return Math.max(1, Math.min(maxScale, snapped));
}

// Resizes the canvas backing store if needed and returns the scale to apply to the context.
export function fitCanvasToDisplay(canvas, dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1)) {
  const rect = canvas.getBoundingClientRect();
  const scale = computeRenderScale(rect.width, dpr);
  const w = Math.round(LOGICAL_WIDTH * scale);
  const h = Math.round(LOGICAL_HEIGHT * scale);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return scale;
}
