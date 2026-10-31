/**
 * Mantra MFS110 RD Service fingerprint capture + verify for RMS.
 * Uses the L1 capture format.
 *
 * One Scan click = one finger press on the device (never auto-retry CAPTURE).
 */

import api from '../api/axios';

const PID_OPTIONS_FMR = `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/><CustOpts><Param name="mantrakey" value=""/></CustOpts></PidOptions>`;

const PID_OPTIONS_L1 = `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/><CustOpts><Param name="mantrakey" value=""/></CustOpts></PidOptions>`;

type PidKind = 'L1' | 'FMR';

const PORTS = Array.from({ length: 21 }, (_, i) => 11100 + i);
/** Prefer common Mantra ports first (most installs use 11100/11101). */
const PREFERRED_PORTS = [11100, 11101, 11102, 11103, 11104, 11105];
const PROBE_TIMEOUT_MS = 350;
const CAPTURE_TIMEOUT_MS = 25000;
const RD_CACHE_KEY = 'rms_mantra_rd_service_v1';
const PID_KIND_CACHE_KEY = 'rms_mantra_pid_kind_v1';

type RdService = {
  baseUrl: string;
  capturePath: string;
  infoPath: string;
};

export type FingerprintDeviceStatus = {
  connected: boolean;
  baseUrl?: string;
  model?: string;
  message: string;
};

export type EnrollmentCapture = {
  pidData: string;
  isoTemplate?: string;
};

let memoryRdCache: RdService | null = null;
let memoryPidKind: PidKind | null = null;
/** Prevent double-click starting two overlapping CAPTURE calls */
let captureInFlight: Promise<string> | null = null;

function schemes(): Array<'https' | 'http'> {
  const https =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  return https ? ['https', 'http'] : ['http', 'https'];
}

function statusOf(xml: string): string | null {
  const m = xml.match(/\bstatus\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].toUpperCase() : null;
}

function pathFor(xml: string, id: string, fallback: string): string {
  const re = new RegExp(
    `id=["']${id}["'][^>]*path=["']([^"']+)["']|path=["']([^"']+)["'][^>]*id=["']${id}["']`,
    'i',
  );
  const m = xml.match(re);
  return m?.[1] || m?.[2] || fallback;
}

function readRdCache(): RdService | null {
  if (memoryRdCache) return memoryRdCache;
  try {
    const raw = sessionStorage.getItem(RD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RdService;
    if (parsed?.baseUrl && parsed?.capturePath) {
      memoryRdCache = parsed;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeRdCache(rd: RdService) {
  memoryRdCache = rd;
  try {
    sessionStorage.setItem(RD_CACHE_KEY, JSON.stringify(rd));
  } catch {
    /* ignore */
  }
}

function clearRdCache() {
  memoryRdCache = null;
  try {
    sessionStorage.removeItem(RD_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

function readPidKind(): PidKind {
  if (memoryPidKind) return memoryPidKind;
  try {
    const v = sessionStorage.getItem(PID_KIND_CACHE_KEY);
    if (v === 'FMR' || v === 'L1') {
      memoryPidKind = v;
      return v;
    }
  } catch {
    /* ignore */
  }
  return 'L1';
}

function writePidKind(kind: PidKind) {
  memoryPidKind = kind;
  try {
    sessionStorage.setItem(PID_KIND_CACHE_KEY, kind);
  } catch {
    /* ignore */
  }
}

function pidOptionsFor(kind: PidKind): string {
  return kind === 'FMR' ? PID_OPTIONS_FMR : PID_OPTIONS_L1;
}

function isPidOptionsRejected(message: string): boolean {
  return /pidoptions|strictly adhere|ftype|invalid.*opts/i.test(message || '');
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type ProbeResult =
  | { kind: 'READY'; rd: RdService }
  | { kind: 'NOTREADY'; status: string }
  | { kind: 'ABSENT' };

async function probeOne(baseUrl: string): Promise<ProbeResult> {
  try {
    const res = await fetchWithTimeout(
      `${baseUrl}/`,
      { method: 'RDSERVICE', headers: { Accept: 'text/xml' } },
      PROBE_TIMEOUT_MS,
    );
    if (!res.ok) return { kind: 'ABSENT' };
    const xml = await res.text();
    if (!xml || !/<RDService/i.test(xml)) return { kind: 'ABSENT' };

    const status = statusOf(xml);
    if (status === 'READY' || status === 'USED') {
      return {
        kind: 'READY',
        rd: {
          baseUrl,
          capturePath: pathFor(xml, 'CAPTURE', '/rd/capture'),
          infoPath: pathFor(xml, 'DEVICEINFO', '/rd/info'),
        },
      };
    }
    return { kind: 'NOTREADY', status: status || 'UNKNOWN' };
  } catch {
    return { kind: 'ABSENT' };
  }
}

function buildCombos(ports: number[]): string[] {
  const combos: string[] = [];
  for (const scheme of schemes()) {
    for (const port of ports) {
      combos.push(`${scheme}://127.0.0.1:${port}`);
    }
  }
  return combos;
}

/** Race probes; return as soon as the first READY appears (don’t wait for all ports). */
async function firstReadyAmong(combos: string[]): Promise<{
  ready?: RdService;
  notReadyStatus?: string;
}> {
  if (!combos.length) return {};

  return new Promise((resolve) => {
    let pending = combos.length;
    let notReadyStatus: string | undefined;
    let settled = false;

    const done = (value: { ready?: RdService; notReadyStatus?: string }) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    for (const baseUrl of combos) {
      probeOne(baseUrl).then((r) => {
        if (settled) return;
        if (r.kind === 'READY') {
          done({ ready: r.rd });
          return;
        }
        if (r.kind === 'NOTREADY' && !notReadyStatus) {
          notReadyStatus = r.status;
        }
        pending -= 1;
        if (pending === 0) {
          done({ notReadyStatus });
        }
      });
    }
  });
}

async function findReadyRdService(): Promise<RdService> {
  const cached = readRdCache();
  if (cached) {
    const quick = await probeOne(cached.baseUrl);
    if (quick.kind === 'READY') return quick.rd;
    clearRdCache();
  }

  const preferred = await firstReadyAmong(buildCombos(PREFERRED_PORTS));
  if (preferred.ready) {
    writeRdCache(preferred.ready);
    return preferred.ready;
  }

  const restPorts = PORTS.filter((p) => !PREFERRED_PORTS.includes(p));
  const rest = await firstReadyAmong(buildCombos(restPorts));
  if (rest.ready) {
    writeRdCache(rest.ready);
    return rest.ready;
  }

  const notReadyStatus = preferred.notReadyStatus || rest.notReadyStatus;
  if (notReadyStatus) {
    throw new Error(
      `Fingerprint scanner found but status is ${notReadyStatus}. Plug in the Mantra scanner and wait until RD Service shows READY, then Scan.`,
    );
  }

  const onHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  const httpsTip = onHttps
    ? ' Because this site is HTTPS: if RD Service uses https://127.0.0.1, open that URL once in this browser and accept the certificate warning, then retry.'
    : '';

  throw new Error(
    'Mantra RD Service not found on this PC (ports 11100–11120). Install the Mantra MFS110 RD Service, confirm the tray icon shows running/READY, use Chrome/Edge on the same PC as the scanner. Test: https://rdtest.aadhaardevice.com/.' +
      httpsTip,
  );
}

async function readDeviceModel(rd: RdService): Promise<string | undefined> {
  try {
    const res = await fetchWithTimeout(
      `${rd.baseUrl}${rd.infoPath}`,
      { method: 'DEVICEINFO', headers: { Accept: 'text/xml' } },
      PROBE_TIMEOUT_MS,
    );
    if (!res.ok) return undefined;
    const xml = await res.text();
    return xml.match(/\bmi\s*=\s*["']([^"']+)["']/i)?.[1];
  } catch {
    return undefined;
  }
}

export function isValidSuccessfulPidCapture(xml: string): boolean {
  if (!xml || !/<PidData[\s>]/i.test(xml)) return false;

  const codes = [...xml.matchAll(/errCode\s*=\s*["']([^"']+)["']/gi)].map((m) =>
    m[1].trim(),
  );
  if (!codes.length || !codes.every((c) => c === '0')) return false;

  const data =
    xml.match(/<Data\b[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/Data>/i)?.[1]?.trim() ||
    xml.match(/<Data\b[^>]*>([^<]{32,})<\/Data>/i)?.[1]?.trim();
  return !!data;
}

function errorFromPidXml(xml: string): Error {
  const code = xml.match(/errCode\s*=\s*["']([^"']+)["']/i)?.[1];
  const info = xml.match(/errInfo\s*=\s*["']([^"']*)["']/i)?.[1] || '';

  if (
    code === '720' ||
    code === '740' ||
    /not ready|not connected/i.test(info)
  ) {
    return new Error(
      `Device not ready${code ? ` (errCode ${code})` : ''}. Unplug and plug in the Mantra scanner, wait for READY, place your finger, then Scan.`,
    );
  }
  if (code === '700' || /timeout/i.test(info)) {
    return new Error(
      'Capture timed out. Keep your finger on the scanner and Scan again.',
    );
  }
  if (/pidoptions|strictly adhere/i.test(info)) {
    return new Error(
      `RD rejected PidOptions (${info || 'invalid'}). Update the Mantra RD Service and retry.`,
    );
  }
  return new Error(
    info
      ? `${info}. Place your finger firmly on the scanner and Scan again.`
      : 'Fingerprint capture failed. Place your finger firmly on the scanner and Scan again.',
  );
}

async function capturePid(rd: RdService, pidOptions: string): Promise<string> {
  const url = `${rd.baseUrl}${rd.capturePath}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'CAPTURE',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          Accept: 'text/xml',
        },
        body: pidOptions,
      },
      CAPTURE_TIMEOUT_MS,
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Capture timed out waiting for RD Service. Place your finger firmly on the scanner and Scan again.',
      );
    }
    throw new Error(
      'Could not reach RD Service for capture. Confirm Mantra RD Service is still running and READY, then Scan again.',
    );
  }

  if (!res.ok) {
    throw new Error(
      `RD capture HTTP ${res.status}. Is Mantra RD Service running?`,
    );
  }

  const xml = await res.text();
  if (!xml) throw new Error('Empty response from RD Service.');

  if (isValidSuccessfulPidCapture(xml)) return xml;

  if (/<PidData[\s>]|<Resp[\s>]/i.test(xml)) {
    throw errorFromPidXml(xml);
  }

  throw new Error(
    'Unexpected RD response. Confirm Capture works on https://rdtest.aadhaardevice.com/',
  );
}

/**
 * User-creation scans ask for a clear fingerprint template first so Finger 1
 * and Finger 2 can be compared. If this scanner rejects that request, use the
 * normal L1 scan so the button can still show Captured.
 */
async function captureEnrollmentScan(): Promise<string> {
  if (captureInFlight) return captureInFlight;

  captureInFlight = (async () => {
    const rd = await findReadyRdService();
    try {
      return await capturePid(rd, PID_OPTIONS_FMR);
    } catch (e: any) {
      if (!isPidOptionsRejected(String(e?.message || ''))) throw e;
      return await capturePid(rd, PID_OPTIONS_L1);
    }
  })();

  try {
    return await captureInFlight;
  } finally {
    captureInFlight = null;
  }
}

/**
 * Exactly ONE device CAPTURE per Scan click.
 * Never auto-retries with a second PidOptions in the same click (that caused 2 finger presses).
 * If PidOptions are rejected, switch preferred kind for the *next* Scan only.
 */
async function capturePidDataOnce(): Promise<string> {
  if (captureInFlight) return captureInFlight;

  captureInFlight = (async () => {
    const rd = await findReadyRdService();
    const kind = readPidKind();
    try {
      const xml = await capturePid(rd, pidOptionsFor(kind));
      writePidKind(kind);
      return xml;
      } catch (e: any) {
      const msg = String(e?.message || '');
      if (isPidOptionsRejected(msg)) {
        const alt: PidKind = kind === 'L1' ? 'FMR' : 'L1';
        writePidKind(alt);
        throw new Error(
          'Scanner options updated for this PC. Click Scan once more and place your finger (one press only).',
        );
      }
      throw e;
    }
  })();

  try {
    return await captureInFlight;
  } finally {
    captureInFlight = null;
  }
}

function looksLikeFmrB64(cleaned: string): boolean {
  try {
    const bin = atob(cleaned);
    return (
      bin.length >= 28 &&
      bin.charCodeAt(0) === 0x46 &&
      bin.charCodeAt(1) === 0x4d &&
      bin.charCodeAt(2) === 0x52
    );
  } catch {
    return false;
  }
}

/** Extract ISO/FMR template from PidData when RD provides it in clear form. */
export function extractIsoTemplateFromPidXml(xml: string): string | undefined {
  if (!xml) return undefined;

  const fmrBio = xml.match(
    /<Bio\b[^>]*type\s*=\s*["']FMR["'][^>]*>([^<]+)<\/Bio>/i,
  )?.[1];
  if (fmrBio) {
    const cleaned = fmrBio.trim().replace(/\s+/g, '');
    if (looksLikeFmrB64(cleaned)) return cleaned;
  }

  const chunks = [
    xml.match(/<Bio\b[^>]*>([^<]+)<\/Bio>/i)?.[1],
    xml.match(
      /<Param\b[^>]*name\s*=\s*["'][^"']*(?:iso|fmr|template|Fmrt)[^"']*["'][^>]*value\s*=\s*["']([^"']+)["']/i,
    )?.[1],
  ];

  for (const chunk of chunks) {
    if (!chunk) continue;
    const cleaned = chunk.trim().replace(/\s+/g, '');
    if (looksLikeFmrB64(cleaned)) return cleaned;
  }

  // Encrypted L1 Data — skip expensive blob scanning
  const dataType = xml.match(/<Data\b[^>]*type\s*=\s*["']([^"']+)["']/i)?.[1];
  if (dataType && /^x$/i.test(dataType.trim())) {
    return undefined;
  }

  const dataChunk =
    xml.match(/<Data\b[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/Data>/i)?.[1] ||
    xml.match(/<Data\b[^>]*>([^<]+)<\/Data>/i)?.[1];

  if (dataChunk) {
    const cleaned = dataChunk.trim().replace(/\s+/g, '');
    if (looksLikeFmrB64(cleaned)) return cleaned;
    if (cleaned.length <= 4096) {
      try {
        const decoded = atob(cleaned);
        if (decoded.includes('<Bio') || decoded.includes('FMR')) {
          const nested = extractIsoTemplateFromPidXml(decoded);
          if (nested) return nested;
        }
      } catch {
        /* encrypted */
      }
    }
  }

  return undefined;
}

function apiErrorMessage(err: any): string {
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join(', ');
  if (typeof m === 'string') return m;
  return err?.message || 'Fingerprint verification failed';
}

export async function checkFingerprintDevice(): Promise<FingerprintDeviceStatus> {
  try {
    const rd = await findReadyRdService();
    const model = await readDeviceModel(rd);
    return {
      connected: true,
      baseUrl: rd.baseUrl,
      model,
      message: model
        ? `Ready — ${model} at ${rd.baseUrl}`
        : `RD Service READY at ${rd.baseUrl}`,
    };
  } catch (e: any) {
    return {
      connected: false,
      message: e?.message || 'Fingerprint device not connected',
    };
  }
}

export const biometricService = {
  checkDevice: checkFingerprintDevice,

  /** Raw capture — one finger press. */
  captureFingerprint: async (): Promise<string> => capturePidDataOnce(),

  /**
   * Enrollment: one finger press only (no second Demo capture).
   * Rejects a finger that is already registered (does not overwrite).
   */
  captureForEnrollment: async (opts?: {
    otherIsoTemplates?: Array<string | null | undefined>;
    otherPidData?: Array<string | null | undefined>;
    excludeUserId?: string;
    excludeStaffId?: string;
  }): Promise<EnrollmentCapture> => {
    const pidData = await captureEnrollmentScan();
    const isoTemplate = extractIsoTemplateFromPidXml(pidData);
    try {
      await api.post('/auth/check-fingerprint-available', {
        biometricData: pidData,
        isoTemplate,
        otherIsoTemplates: (opts?.otherIsoTemplates || []).filter(Boolean),
        otherPidData: (opts?.otherPidData || []).filter(Boolean),
        excludeUserId: opts?.excludeUserId,
        excludeStaffId: opts?.excludeStaffId,
      });
    } catch (err: any) {
      throw new Error(
        apiErrorMessage(err) || 'This fingerprint is already registered',
      );
    }
    return { pidData, isoTemplate };
  },

  /**
   * Form Scan: ONE finger press → backend verify.
   */
  captureAndVerifyLoggedInUser: async (): Promise<string> => {
    const pidData = await capturePidDataOnce();
    const isoTemplate = extractIsoTemplateFromPidXml(pidData);

    try {
      await api.post('/auth/verify-fingerprint', {
        biometricData: pidData,
        isoTemplate,
      });
    } catch (err: any) {
      throw new Error(apiErrorMessage(err) || 'Fingerprint does not match the logged-in user');
    }

    return pidData;
  },
};
