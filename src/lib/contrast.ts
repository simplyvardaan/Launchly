// WCAG 2.1 Relative Luminance & Contrast Ratio Calculator

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '').trim();
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3 || cleanHex.length === 4) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) || 0;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) || 0;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) || 0;
  } else {
    const fullHex = cleanHex.padEnd(6, '0').slice(0, 6);
    const num = parseInt(fullHex, 16) || 0;
    r = (num >> 16) & 255;
    g = (num >> 8) & 255;
    b = num & 255;
  }
  return [r, g, b];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(fgHex: string, bgHex: string): number {
  try {
    const [r1, g1, b1] = hexToRgb(fgHex);
    const [r2, g2, b2] = hexToRgb(bgHex);
    const l1 = getLuminance(r1, g1, b1);
    const l2 = getLuminance(r2, g2, b2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
  } catch {
    return 1;
  }
}

export function getWcagLevel(ratio: number): {
  level: 'AAA' | 'AA' | 'AA Large' | 'Fail';
  pass: boolean;
  color: string;
} {
  if (ratio >= 7.0) {
    return { level: 'AAA', pass: true, color: '#10b981' };
  }
  if (ratio >= 4.5) {
    return { level: 'AA', pass: true, color: '#10b981' };
  }
  if (ratio >= 3.0) {
    return { level: 'AA Large', pass: true, color: '#f59e0b' };
  }
  return { level: 'Fail', pass: false, color: '#ef4444' };
}

export function suggestAccessibleColor(fgHex: string, bgHex: string): string {
  try {
    const [r, g, b] = hexToRgb(bgHex);
    const bgL = getLuminance(r, g, b);
    // If background is dark, return bright accessible text (#F4F4F6 or #FFFFFF)
    // If background is light, return dark accessible text (#111111)
    return bgL < 0.5 ? '#FFFFFF' : '#111111';
  } catch {
    return '#111111';
  }
}
