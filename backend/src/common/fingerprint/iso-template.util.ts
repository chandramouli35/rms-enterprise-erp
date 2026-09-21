/**
 * Strict ISO/IEC 19794-2 (FMR) extract + 1:1 match.
 * Encrypted Mantra PidData is rejected. No string-equality or presence fallback.
 */

export type Minutia = { x: number; y: number; angle: number };

const MIN_MINUTIAE = 8;
const MIN_PAIRED = 12;
const MIN_RATIO = 0.5;
const MATCH_DIST = 12;
const MATCH_ANGLE = 18;

export function extractTemplateBase64(xmlOrB64: string): string | null {
  if (!xmlOrB64 || typeof xmlOrB64 !== 'string') return null;
  const raw = xmlOrB64.trim();

  if (!raw.includes('<')) {
    const cleaned = raw.replace(/\s+/g, '');
    return looksLikeIsoFmr(cleaned) ? cleaned : null;
  }

  const chunks = [
    raw.match(/<Data\b[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/Data>/i)?.[1],
    raw.match(/<Data\b[^>]*>([^<]+)<\/Data>/i)?.[1],
    raw.match(/<Bio\b[^>]*>([^<]+)<\/Bio>/i)?.[1],
    raw.match(
      /<Param\b[^>]*name\s*=\s*["'][^"']*(?:iso|fmr|template)[^"']*["'][^>]*value\s*=\s*["']([^"']+)["']/i,
    )?.[1],
  ];

  for (const chunk of chunks) {
    if (!chunk) continue;
    const cleaned = chunk.trim().replace(/\s+/g, '');
    if (looksLikeIsoFmr(cleaned)) return cleaned;
  }
  return null;
}

export function looksLikeIsoFmr(b64: string): boolean {
  try {
    const buf = Buffer.from(b64, 'base64');
    return (
      buf.length >= 36 &&
      buf[0] === 0x46 &&
      buf[1] === 0x4d &&
      buf[2] === 0x52 &&
      buf[3] === 0x00
    );
  } catch {
    return false;
  }
}

/** ISO 19794-2:2005 minutiae only. Wrong layout → empty (no guess). */
export function parseIso19794Minutiae(templateB64: string): Minutia[] {
  if (!looksLikeIsoFmr(templateB64)) return [];
  const buf = Buffer.from(templateB64.replace(/\s+/g, ''), 'base64');
  if (buf.length < 30) return [];

  const views = buf.readUInt8(24);
  if (views < 1 || views > 4) return [];

  const count = buf.readUInt8(29);
  if (count < MIN_MINUTIAE || count > 128) return [];
  if (30 + count * 6 > buf.length) return [];

  const minutiae: Minutia[] = [];
  for (let i = 0; i < count; i++) {
    const p = 30 + i * 6;
    const x = ((buf[p] & 0x3f) << 8) | buf[p + 1];
    const y = ((buf[p + 2] & 0x3f) << 8) | buf[p + 3];
    const angle = buf[p + 4];
    if (x > 2047 || y > 2047) return [];
    minutiae.push({ x, y, angle });
  }
  return minutiae;
}

function angleDelta(a: number, b: number): number {
  let d = Math.abs(a - b) % 256;
  if (d > 128) d = 256 - d;
  return d;
}

function countAligned(probe: Minutia[], gallery: Minutia[], pi: number, gi: number): number {
  const p0 = probe[pi];
  const g0 = gallery[gi];
  const dAngle = g0.angle - p0.angle;
  const theta = (dAngle * 2 * Math.PI) / 256;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const used = new Set<number>();
  let paired = 0;

  for (const pm of probe) {
    const dx = pm.x - p0.x;
    const dy = pm.y - p0.y;
    const rx = dx * cos - dy * sin + g0.x;
    const ry = dx * sin + dy * cos + g0.y;
    const pa = (pm.angle + dAngle + 256) % 256;

    let best = -1;
    let bestDist = MATCH_DIST + 0.01;
    for (let i = 0; i < gallery.length; i++) {
      if (used.has(i)) continue;
      const g = gallery[i];
      const dist = Math.hypot(rx - g.x, ry - g.y);
      if (dist >= bestDist) continue;
      if (angleDelta(pa, g.angle) > MATCH_ANGLE) continue;
      bestDist = dist;
      best = i;
    }
    if (best >= 0) {
      used.add(best);
      paired++;
    }
  }
  return paired;
}

/** True only when aligned minutiae clearly match. Different fingers fail. */
export function templatesMatch(
  liveXmlOrTemplate: string,
  enrolledXmlOrTemplate: string,
): boolean {
  const liveB64 = extractTemplateBase64(liveXmlOrTemplate);
  const enrolledB64 = extractTemplateBase64(enrolledXmlOrTemplate);
  if (!liveB64 || !enrolledB64) return false;

  const probe = parseIso19794Minutiae(liveB64);
  const gallery = parseIso19794Minutiae(enrolledB64);
  if (probe.length < MIN_MINUTIAE || gallery.length < MIN_MINUTIAE) return false;

  let best = 0;
  const stepP = probe.length > 28 ? 2 : 1;
  const stepG = gallery.length > 28 ? 2 : 1;
  for (let pi = 0; pi < probe.length; pi += stepP) {
    for (let gi = 0; gi < gallery.length; gi += stepG) {
      const n = countAligned(probe, gallery, pi, gi);
      if (n > best) best = n;
    }
  }

  const smaller = Math.min(probe.length, gallery.length);
  return best >= MIN_PAIRED && best / smaller >= MIN_RATIO;
}

export function isMatchableTemplate(value: string | null | undefined): boolean {
  if (!value) return false;
  const b64 = extractTemplateBase64(value);
  return !!b64 && parseIso19794Minutiae(b64).length >= MIN_MINUTIAE;
}
