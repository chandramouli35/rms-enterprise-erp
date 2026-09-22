/**
 * ISO/IEC 19794-2 (FMR) extract + 1:1 minutiae match.
 * Prefer real template match. Encrypted PidData alone is not treated as a template.
 */

export type Minutia = { x: number; y: number; angle: number };

const MIN_MINUTIAE = 6;
const MIN_PAIRED = 8;
const MIN_RATIO = 0.4;
const MATCH_DIST = 15;
const MATCH_ANGLE = 22;

export function looksLikeIsoFmr(b64: string): boolean {
  try {
    const buf = Buffer.from(b64.replace(/\s+/g, ''), 'base64');
    if (buf.length < 28) return false;
    return buf[0] === 0x46 && buf[1] === 0x4d && buf[2] === 0x52;
  } catch {
    return false;
  }
}

export function extractTemplateBase64(xmlOrB64: string): string | null {
  if (!xmlOrB64 || typeof xmlOrB64 !== 'string') return null;
  const raw = xmlOrB64.trim();

  if (!raw.includes('<')) {
    const cleaned = raw.replace(/\s+/g, '');
    return looksLikeIsoFmr(cleaned) ? cleaned : null;
  }

  // Fast path: explicit FMR Bio only (skip encrypted Data digging)
  const fmrBio = raw.match(
    /<Bio\b[^>]*type\s*=\s*["']FMR["'][^>]*>([^<]+)<\/Bio>/i,
  )?.[1];
  if (fmrBio) {
    const cleaned = fmrBio.trim().replace(/\s+/g, '');
    if (looksLikeIsoFmr(cleaned)) return cleaned;
  }

  const directChunks = [
    raw.match(/<Bio\b[^>]*>([^<]+)<\/Bio>/i)?.[1],
    raw.match(
      /<Param\b[^>]*name\s*=\s*["'][^"']*(?:iso|fmr|template|Fmrt)[^"']*["'][^>]*value\s*=\s*["']([^"']+)["']/i,
    )?.[1],
  ];

  for (const chunk of directChunks) {
    if (!chunk) continue;
    const cleaned = chunk.trim().replace(/\s+/g, '');
    if (looksLikeIsoFmr(cleaned)) return cleaned;
  }

  // Encrypted L1 PidData (type="X" / large opaque Data): do not byte-scan — too slow
  const dataType = raw.match(/<Data\b[^>]*type\s*=\s*["']([^"']+)["']/i)?.[1];
  if (dataType && /^x$/i.test(dataType.trim())) {
    return null;
  }

  const dataChunk =
    raw.match(/<Data\b[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/Data>/i)?.[1] ||
    raw.match(/<Data\b[^>]*>([^<]+)<\/Data>/i)?.[1];

  if (dataChunk) {
    const cleaned = dataChunk.trim().replace(/\s+/g, '');
    if (looksLikeIsoFmr(cleaned)) return cleaned;

    // Only decode when payload is modest (clear nested XML), not multi-KB cipher
    if (cleaned.length <= 4096) {
      try {
        const buf = Buffer.from(cleaned, 'base64');
        const decoded = buf.toString('utf8');
        if (decoded.includes('<')) {
          const nested = extractTemplateBase64(decoded);
          if (nested) return nested;
        }
        if (buf.length <= 2048) {
          const nestedBin = findFmrInBuffer(buf);
          if (nestedBin) return nestedBin;
        }
      } catch {
        /* ignore */
      }
    }
  }

  return null;
}

function findFmrInBuffer(buf: Buffer): string | null {
  const limit = Math.min(buf.length - 28, 512);
  for (let i = 0; i < limit; i++) {
    if (buf[i] === 0x46 && buf[i + 1] === 0x4d && buf[i + 2] === 0x52) {
      const slice = buf.slice(i);
      const b64 = slice.toString('base64');
      if (parseIso19794Minutiae(b64).length >= MIN_MINUTIAE) return b64;
    }
  }
  return null;
}

/** Parse ISO 19794-2 minutiae (standard header + tolerant scan). */
export function parseIso19794Minutiae(templateB64: string): Minutia[] {
  if (!looksLikeIsoFmr(templateB64)) return [];
  const buf = Buffer.from(templateB64.replace(/\s+/g, ''), 'base64');
  if (buf.length < 30) return [];

  const tryAt = (countOffset: number): Minutia[] => {
    if (countOffset >= buf.length) return [];
    const count = buf.readUInt8(countOffset);
    if (count < MIN_MINUTIAE || count > 128) return [];
    const start = countOffset + 1;
    if (start + count * 6 > buf.length) return [];
    const minutiae: Minutia[] = [];
    for (let i = 0; i < count; i++) {
      const p = start + i * 6;
      const x = ((buf[p] & 0x3f) << 8) | buf[p + 1];
      const y = ((buf[p + 2] & 0x3f) << 8) | buf[p + 3];
      const angle = buf[p + 4];
      if (x > 2047 || y > 2047) return [];
      minutiae.push({ x, y, angle });
    }
    return minutiae;
  };

  // Common ISO 19794-2:2005 layout
  const standard = tryAt(29);
  if (standard.length) return standard;

  // Tolerant: find a plausible minutiae block after the FMR header
  for (let off = 20; off < Math.min(buf.length - 20, 80); off++) {
    const m = tryAt(off);
    if (m.length >= MIN_MINUTIAE) return m;
  }
  return [];
}

function angleDelta(a: number, b: number): number {
  let d = Math.abs(a - b) % 256;
  if (d > 128) d = 256 - d;
  return d;
}

function countAligned(
  probe: Minutia[],
  gallery: Minutia[],
  pi: number,
  gi: number,
): number {
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

export function templatesMatch(
  liveXmlOrTemplate: string,
  enrolledXmlOrTemplate: string,
): boolean {
  // Callers usually pass already-validated FMR base64; avoid re-parsing PidData
  const liveB64 = looksLikeIsoFmr(liveXmlOrTemplate.replace(/\s+/g, ''))
    ? liveXmlOrTemplate.replace(/\s+/g, '')
    : extractTemplateBase64(liveXmlOrTemplate);
  const enrolledB64 = looksLikeIsoFmr(enrolledXmlOrTemplate.replace(/\s+/g, ''))
    ? enrolledXmlOrTemplate.replace(/\s+/g, '')
    : extractTemplateBase64(enrolledXmlOrTemplate);
  if (!liveB64 || !enrolledB64) return false;

  const probe = parseIso19794Minutiae(liveB64);
  const gallery = parseIso19794Minutiae(enrolledB64);
  if (probe.length < MIN_MINUTIAE || gallery.length < MIN_MINUTIAE) return false;

  let best = 0;
  const stepP = probe.length > 30 ? 2 : 1;
  const stepG = gallery.length > 30 ? 2 : 1;
  for (let pi = 0; pi < probe.length; pi += stepP) {
    for (let gi = 0; gi < gallery.length; gi += stepG) {
      const n = countAligned(probe, gallery, pi, gi);
      if (n > best) best = n;
      if (best >= MIN_PAIRED && best / Math.min(probe.length, gallery.length) >= MIN_RATIO) {
        return true;
      }
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

export function isValidPidData(xml: string | null | undefined): boolean {
  if (!xml || !/<PidData[\s>]/i.test(xml)) return false;
  const codes = [...xml.matchAll(/errCode\s*=\s*["']([^"']+)["']/gi)].map((m) =>
    m[1].trim(),
  );
  return !!codes.length && codes.every((c) => c === '0');
}
