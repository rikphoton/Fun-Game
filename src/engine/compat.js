// NeonPulse Arcade - Browser compatibility helpers & polyfills.
// Imported first by main.js so every game can rely on these APIs.

// --- CanvasRenderingContext2D.roundRect (Chrome 99+, Safari 16+, Firefox 112+) ---
// Older iOS / smart-TV / embedded browsers lack it and would throw every frame.
export function installRoundRectPolyfill(proto) {
  if (!proto || typeof proto.roundRect === 'function') return;

  proto.roundRect = function roundRect(x, y, w, h, radii) {
    let r = radii === undefined ? 0 : radii;
    if (typeof r === 'object' && r !== null && !Array.isArray(r)) {
      // DOMPointInit-style radius
      r = r.x !== undefined ? r.x : 0;
    }
    const list = Array.isArray(r) ? r.map((v) => (typeof v === 'object' && v !== null ? (v.x || 0) : v)) : [r];
    let tl, tr, br, bl;
    switch (list.length) {
      case 1: tl = tr = br = bl = list[0]; break;
      case 2: tl = br = list[0]; tr = bl = list[1]; break;
      case 3: tl = list[0]; tr = bl = list[1]; br = list[2]; break;
      default: tl = list[0]; tr = list[1]; br = list[2]; bl = list[3]; break;
    }

    // Negative sizes: normalise so the path stays valid.
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }

    const clampR = (v) => Math.max(0, Math.min(v || 0, Math.min(w, h) / 2));
    tl = clampR(tl); tr = clampR(tr); br = clampR(br); bl = clampR(bl);

    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.arcTo(x + w, y, x + w, y + tr, tr);
    this.lineTo(x + w, y + h - br);
    this.arcTo(x + w, y + h, x + w - br, y + h, br);
    this.lineTo(x + bl, y + h);
    this.arcTo(x, y + h, x, y + h - bl, bl);
    this.lineTo(x, y + tl);
    this.arcTo(x, y, x + tl, y, tl);
    this.closePath();
  };
}

if (typeof CanvasRenderingContext2D !== 'undefined') {
  installRoundRectPolyfill(CanvasRenderingContext2D.prototype);
}

// --- Fullscreen (standard + webkit-prefixed; unsupported on iPhone Safari) ---
export function fullscreenSupported(doc = document) {
  const root = doc.documentElement;
  return !!(root.requestFullscreen || root.webkitRequestFullscreen);
}

export function isFullscreen(doc = document) {
  return !!(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export function enterFullscreen(doc = document) {
  const root = doc.documentElement;
  try {
    if (root.requestFullscreen) {
      const p = root.requestFullscreen();
      if (p && p.catch) p.catch(() => {});
    } else if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
    }
  } catch (e) {
    // Fullscreen refused (iframe policy, no user gesture, etc.)
  }
}

export function exitFullscreen(doc = document) {
  try {
    if (doc.exitFullscreen) {
      const p = doc.exitFullscreen();
      if (p && p.catch) p.catch(() => {});
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    }
  } catch (e) {
    // Ignore
  }
}

export function toggleFullscreen(doc = document) {
  if (isFullscreen(doc)) exitFullscreen(doc);
  else enterFullscreen(doc);
}

// --- Local calendar date as YYYY-MM-DD (toISOString() is UTC and shows the wrong day in e.g. IST) ---
export function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
