/**
 * Extract / match ISO 19794-2 (FMR) templates from Mantra PidData or raw base64.
 * RD production PidData often encrypts <Data> — extraction then returns null.
 */

export type Minutia = { x: number; y: number; angle: number; type: number };

/** Pull base64 payload from PidData <Data>, <Bio type="FMR">, or template Params. */
export function extractTemplateBase64(xmlOrB64: string): string | null {
  if (!xmlOrB64 || typeof xmlOrB64 !== 'string') return null;
  const raw = xmlOrB64.trim();

  // Already a bare base64 template
  if (!raw.includes('<') && /^[A-Za-z0-9+/=\r\n]+$/.test(raw) && raw.length >= 64) {
    return raw.replace(/\s+/g, '');
  }

  const cdata =
    raw.match(/<Data\b[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/Data>/i)?.[1]?.trim() ||
    raw.match(/<Data\b[^>]*>([^<]{32,})<\/Data>/i)?.[1]?.trim();
  if (cdata) {
    const cleaned = cdata.replace(/\s+/g, '');
    if (looksLikeIsoFmr(cleaned)) return cleaned;
    // May still be encrypted — keep for header probe below
    const nested = findFmrBase64InBuffer(Buffer.from(cleaned, 'base64'));
    if (nested) return nested;
  }

  const bio =
    raw.match(/<Bio\b[^>]*type\s*=\s*["']FMR["'][^>]*>([^<]{32,})<\/Bio>/i)?.[1]?.trim() ||
    raw.match(/<Bio\b[^>]*>([^<]{32,})<\/Bio>/i)?.[1]?.trim();
  if (bio) {
    const cleaned = bio.replace(/\s+/g, '');
    if (looksLikeIsoFmr(cleaned) || cleaned.length >= 64) return cleaned;
  }

  const param =
    raw.match(
      /<Param\b[^>]*name\s*=\s*["'][^"']*(?:iso|fmr|template|Fmrt)[^"']*["'][^>]*value\s*=\s*["']([^"']+)["']/i,
    )?.[1] ||
    raw.match(
      /<Param\b[^>]*value\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["'][^"']*(?:iso|fmr|template|Fmrt)[^"']*["']/i,
    )?.[1];
  if (param && param.length >= 64) return param.replace(/\s+/g, '');

  return null;
}

function looksLikeIsoFmr(b64: string): boolean {
  try {
    const buf = Buffer.from(b64, 'base64');
    return buf.length >= 26 && buf[0] === 0x46 && buf[1] === 0x4d && buf[2] === 0x52;
  } catch {
    return false;
  }
}

function findFmrBase64InBuffer(buf: Buffer): string | null {
  if (!buf?.length) return null;
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf[i] === 0x46 && buf[i + 1] === 0x4d && buf[i + 2] === 0x52 && buf[i + 3] === 0x00) {
      return buf.slice(i).toString('base64');
    }
  }
  return null;
}

/** Parse ISO 19794-2 minutiae (best-effort; supports common FMR layouts). */
export function parseIso19794Minutiae(templateB64: string): Minutia[] {
  const buf = Buffer.from(templateB64.replace(/\s+/g, ''), 'base64');
  if (buf.length < 26) return [];

  let offset = 0;
  if (buf[0] === 0x46 && buf[1] === 0x4d && buf[2] === 0x52) {
    offset = 8; // "FMR\0" + version-ish
    // Common layout: skip header until minutiae count — try standard 19794-2:2005
    // Header is typically 26 bytes before first finger view; be liberal.
    if (buf.length > 26) offset = 26;
  }

  // Walk forward looking for a plausible minutiae count (1..128) then records of 6 bytes
  for (let start = Math.min(offset, buf.length - 2); start < Math.min(buf.length - 8, 80); start++) {
    const count = buf.readUInt8(start);
    if (count < 1 || count > 128) continue;
    const need = start + 1 + count * 6;
    if (need > buf.length) continue;

    const minutiae: Minutia[] = [];
    let ok = true;
    for (let i = 0; i < count; i++) {
      const p = start + 1 + i * 6;
      const x = ((buf[p] & 0x3f) << 8) | buf[p + 1];
      const y = ((buf[p + 2] & 0x3f) << 8) | buf[p + 3];
      const angle = buf[p + 4];
      const type = (buf[p] >> 6) & 0x03;
      if (x > 2048 || y > 2048) {
        ok = false;
        break;
      }
      minutiae.push({ x, y, angle, type });
    }
    if (ok && minutiae.length >= 4) return minutiae;
  }

  return [];
}

/**
 * Simple 1:1 minutiae match score 0..100.
 * Threshold ~35–40 is typical for this lightweight matcher (not SourceAFIS-grade).
 */
export function matchMinutiaeScore(a: Minutia[], b: Minutia[]): number {
  if (!a.length || !b.length) return 0;
  const probe = a.length <= b.length ? a : b;
  const gallery = a.length <= b.length ? b : a;

  const DIST = 18;
  const ANGLE = 20; // 0–255 units (~28°)
  let paired = 0;
  const used = new Set<number>();

  for (const p of probe) {
    let best = -1;
    let bestDist = DIST + 1;
    for (let i = 0; i < gallery.length; i++) {
      if (used.has(i)) continue;
      const g = gallery[i];
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > DIST) continue;
      let da = Math.abs(p.angle - g.angle);
      if (da > 128) da = 256 - da;
      if (da > ANGLE) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (best >= 0) {
      used.add(best);
      paired++;
    }
  }

  const denom = Math.max(probe.length, 8);
  return Math.round((100 * paired) / denom);
}

export const MATCH_SCORE_THRESHOLD = 38;

export function templatesMatch(
  liveXmlOrTemplate: string,
  enrolledXmlOrTemplate: string,
  threshold = MATCH_SCORE_THRESHOLD,
): boolean {
  const liveB64 =
    extractTemplateBase64(liveXmlOrTemplate) ||
    (liveXmlOrTemplate.includes('<') ? null : liveXmlOrTemplate.trim());
  const enrolledB64 =
    extractTemplateBase64(enrolledXmlOrTemplate) ||
    (enrolledXmlOrTemplate.includes('<') ? null : enrolledXmlOrTemplate.trim());

  if (!liveB64 || !enrolledB64) return false;

  const liveM = parseIso19794Minutiae(liveB64);
  const enrolledM = parseIso19794Minutiae(enrolledB64);
  if (liveM.length >= 4 && enrolledM.length >= 4) {
    return matchMinutiaeScore(liveM, enrolledM) >= threshold;
  }

  // Last resort: identical template strings (rare; same capture replay)
  return liveB64 === enrolledB64 && liveB64.length >= 64;
}
