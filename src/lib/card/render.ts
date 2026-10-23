// Renders a verse or hadith as a shareable image: reference, Arabic (right-to-left), translation, and a
// small Mufahras footer. Text is word-wrapped by measuring on the canvas and shrunk together until it
// fits; at the smallest size, the translation is cut with an ellipsis.

export interface CardContent {
  /** Arabic text, or '' for none. Quran Arabic gets the ayah marker appended by the caller. */
  ar: string;
  arFont: 'quran' | 'arabic';
  en: string;
  /** "Quran 2:255" / "Sahih al-Bukhari 1". */
  ref: string;
  sub: string;
}

export type CardStyle = 'light' | 'dark';
export type CardShape = 'square' | 'story';

// Paper and Night from tokens.css; cards look the same whatever theme the app is in.
const STYLES: Record<CardStyle, { bg: string; ink: string; ink2: string; accent: string; rule: string }> = {
  light: { bg: '#faf8f3', ink: '#1f1d1a', ink2: '#5c5850', accent: '#1f6b57', rule: '#e4dfd3' },
  dark: { bg: '#1f242c', ink: '#d3d9e1', ink2: '#9ba6b4', accent: '#8cc5c0', rule: '#3a424e' },
};

const FONTS = { quran: '"Scheherazade New"', arabic: '"Noto Naskh Arabic Variable"', latin: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' };

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/ +/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderCard(c: CardContent, style: CardStyle, shape: CardShape): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = shape === 'square' ? 1080 : 1920;
  const pad = 96;
  const s = STYLES[style];
  const arFamily = FONTS[c.arFont];
  // Canvas text doesn't wait for web fonts: load them for exactly these characters first.
  await Promise.all([c.ar ? document.fonts.load(`64px ${arFamily}`, c.ar) : null, document.fonts.ready]);
  const icon = await loadImage(new URL('icons/icon-192.png', document.baseURI).href);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, W, H);

  // Header: the reference in the accent, its subtitle in ink.
  const headTop = shape === 'square' ? pad : pad * 2;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = s.accent;
  ctx.font = `700 40px ${FONTS.latin}`;
  ctx.fillText(c.ref, pad, headTop + 40);
  ctx.fillStyle = s.ink2;
  ctx.font = `400 30px ${FONTS.latin}`;
  ctx.fillText(c.sub, pad, headTop + 88);

  // Footer: icon, name, address.
  const footH = 72;
  const footTop = H - (shape === 'square' ? pad : pad * 2) - footH;
  ctx.strokeStyle = s.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, footTop - 28);
  ctx.lineTo(W - pad, footTop - 28);
  ctx.stroke();
  if (icon) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, footTop, footH, footH, 16);
    ctx.clip();
    ctx.drawImage(icon, pad, footTop, footH, footH);
    ctx.restore();
  }
  ctx.fillStyle = s.ink;
  ctx.font = `700 32px ${FONTS.latin}`;
  ctx.fillText('Mufahras', pad + footH + 24, footTop + 32);
  ctx.fillStyle = s.ink2;
  ctx.font = `400 26px ${FONTS.latin}`;
  ctx.fillText('omeiirr.github.io/mufahras', pad + footH + 24, footTop + 66);

  // Body: shrink Arabic and translation together until both fit between header and footer.
  const top = headTop + 150;
  const bottom = footTop - 70;
  const width = W - pad * 2;
  const gap = 40;
  let arSize = shape === 'square' ? 64 : 76;
  let enSize = shape === 'square' ? 40 : 46;
  let arLines: string[] = [];
  let enLines: string[] = [];
  const height = () => arLines.length * arSize * 1.9 + (arLines.length ? gap : 0) + enLines.length * enSize * 1.45;
  for (;;) {
    ctx.font = `${arSize}px ${arFamily}`;
    ctx.direction = 'rtl';
    arLines = c.ar ? wrap(ctx, c.ar, width) : [];
    ctx.direction = 'ltr';
    ctx.font = `400 ${enSize}px ${FONTS.latin}`;
    enLines = wrap(ctx, c.en, width);
    if (height() <= bottom - top || enSize <= 24) break;
    arSize *= 0.92;
    enSize *= 0.94;
  }
  // Still too long at the smallest size: keep the Arabic whole if possible, cut the translation.
  while (height() > bottom - top && enLines.length > 1) enLines.pop();
  if (height() > bottom - top) arLines = [];
  if (enLines.length && enLines.join(' ').length < c.en.length) enLines[enLines.length - 1] = `${enLines[enLines.length - 1]!.replace(/\s+\S*$/, '')} …`;

  let y = top + Math.max(0, (bottom - top - height()) / 2);
  ctx.fillStyle = s.ink;
  if (arLines.length) {
    ctx.font = `${arSize}px ${arFamily}`;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    for (const line of arLines) {
      y += arSize * 1.9;
      ctx.fillText(line, W - pad, y - arSize * 0.55);
    }
    y += gap;
  }
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = `400 ${enSize}px ${FONTS.latin}`;
  for (const line of enLines) {
    y += enSize * 1.45;
    ctx.fillText(line, pad, y - enSize * 0.35);
  }
  return canvas;
}

export function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(new File([b], name, { type: 'image/png' })) : reject(new Error('Could not create the image'))), 'image/png'),
  );
}
