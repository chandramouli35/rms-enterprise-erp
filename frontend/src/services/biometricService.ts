/**
 * Mantra MFS110 L1 — RD Service fingerprint capture for RMS.
 *
 * Runs ONLY in the browser on the PC where the scanner is plugged in.
 * Backend cannot see USB / 127.0.0.1.
 *
 * Straight flow:
 *   1. Find RD Service (127.0.0.1:11100–11120) — parallel probe
 *   2. Status must be READY (or USED)
 *   3. CAPTURE with PidOptions (always fCount=1 = one finger)
 *   4. Success only if errCode=0 AND biometric <Data> present
 *
 * Notes:
 *   - fType is template FORMAT (0=FMR, 1=FIR, 2=FMR+FIR), NOT number of fingers.
 *     Finger count is fCount (always 1 for MFS110 single-finger scans).
 *   - fetch() TypeError on a closed port looks identical to CORS/mixed-content.
 *     Closed ports during discovery are NORMAL — never claim "browser blocked"
 *     just because a TypeError happened while scanning empty ports.
 */

/** Single finger (fCount=1), FMR minutiae — common Mantra default */
const PID_OPTIONS_FMR = `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/><CustOpts><Param name="mantrakey" value=""/></CustOpts></PidOptions>`;

/** Single finger (fCount=1), FMR+FIR — often required by L1 RD builds */
const PID_OPTIONS_L1 = `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/><CustOpts><Param name="mantrakey" value=""/></CustOpts></PidOptions>`;

const PORTS = Array.from({ length: 21 }, (_, i) => 11100 + i);
const PROBE_TIMEOUT_MS = 900;
const CAPTURE_TIMEOUT_MS = 25000;

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

function schemes(): Array<"https" | "http"> {
  const https =
    typeof window !== "undefined" && window.location.protocol === "https:";
  // Prefer matching page scheme first (HTTPS app → try https RD first)
  return https ? ["https", "http"] : ["http", "https"];
}

function statusOf(xml: string): string | null {
  const m = xml.match(/\bstatus\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].toUpperCase() : null;
}

function pathFor(xml: string, id: string, fallback: string): string {
  const re = new RegExp(
    `id=["']${id}["'][^>]*path=["']([^"']+)["']|path=["']([^"']+)["'][^>]*id=["']${id}["']`,
    "i",
  );
  const m = xml.match(re);
  return m?.[1] || m?.[2] || fallback;
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
  | { kind: "READY"; rd: RdService }
  | { kind: "NOTREADY"; status: string }
  | { kind: "ABSENT" };

async function probeOne(baseUrl: string): Promise<ProbeResult> {
  try {
    const res = await fetchWithTimeout(
      `${baseUrl}/`,
      { method: "RDSERVICE", headers: { Accept: "text/xml" } },
      PROBE_TIMEOUT_MS,
    );
    if (!res.ok) return { kind: "ABSENT" };
    const xml = await res.text();
    if (!xml || !/<RDService/i.test(xml)) return { kind: "ABSENT" };

    const status = statusOf(xml);
    if (status === "READY" || status === "USED") {
      return {
        kind: "READY",
        rd: {
          baseUrl,
          capturePath: pathFor(xml, "CAPTURE", "/rd/capture"),
          infoPath: pathFor(xml, "DEVICEINFO", "/rd/info"),
        },
      };
    }
    return { kind: "NOTREADY", status: status || "UNKNOWN" };
  } catch {
    // Closed port, timeout, CORS, mixed-content — all look the same to JS.
    // During discovery this is almost always "nothing on this port". Treat as ABSENT.
    return { kind: "ABSENT" };
  }
}

/** Find READY RD Service. All scheme×port probes run in parallel. */
async function findReadyRdService(): Promise<RdService> {
  const combos: string[] = [];
  for (const scheme of schemes()) {
    for (const port of PORTS) {
      combos.push(`${scheme}://127.0.0.1:${port}`);
    }
  }

  const results = await Promise.all(combos.map(probeOne));

  const ready = results.find(
    (r): r is Extract<ProbeResult, { kind: "READY" }> => r.kind === "READY",
  );
  if (ready) return ready.rd;

  const notReady = results.find(
    (r): r is Extract<ProbeResult, { kind: "NOTREADY" }> =>
      r.kind === "NOTREADY",
  );
  if (notReady) {
    throw new Error(
      `Fingerprint scanner found but status is ${notReady.status}. Plug in Mantra MFS110 and wait until RD Service shows READY, then Scan.`,
    );
  }

  // Nothing answered. Give a practical checklist — do NOT claim "browser blocked"
  // just because closed ports threw TypeError during the scan.
  const onHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const httpsTip = onHttps
    ? " Because this site is HTTPS: if RD Service uses https://127.0.0.1, open that URL once in this browser and accept the certificate warning, then retry."
    : "";

  throw new Error(
    "Mantra RD Service not found on this PC (ports 11100–11120). Install MFS110 L1 RD Service, confirm the tray icon shows running/READY, use Chrome/Edge on the same PC as the scanner. Test: https://rdtest.aadhaardevice.com/." +
      httpsTip,
  );
}

async function readDeviceModel(rd: RdService): Promise<string | undefined> {
  try {
    const res = await fetchWithTimeout(
      `${rd.baseUrl}${rd.infoPath}`,
      { method: "DEVICEINFO", headers: { Accept: "text/xml" } },
      PROBE_TIMEOUT_MS,
    );
    if (!res.ok) return undefined;
    const xml = await res.text();
    return xml.match(/\bmi\s*=\s*["']([^"']+)["']/i)?.[1];
  } catch {
    return undefined;
  }
}

/** Strict success: PidData + errCode 0 + non-empty biometric Data (text or CDATA). */
export function isValidSuccessfulPidCapture(xml: string): boolean {
  if (!xml || !/<PidData[\s>]/i.test(xml)) return false;

  const codes = [...xml.matchAll(/errCode\s*=\s*["']([^"']+)["']/gi)].map((m) =>
    m[1].trim(),
  );
  if (!codes.length || !codes.every((c) => c === "0")) return false;

  // Plain text or CDATA inside <Data>
  const data =
    xml
      .match(/<Data\b[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/Data>/i)?.[1]
      ?.trim() || xml.match(/<Data\b[^>]*>([^<]{32,})<\/Data>/i)?.[1]?.trim();
  return !!data;
}

function errorFromPidXml(xml: string): Error {
  const code = xml.match(/errCode\s*=\s*["']([^"']+)["']/i)?.[1];
  const info = xml.match(/errInfo\s*=\s*["']([^"']*)["']/i)?.[1] || "";

  if (
    code === "720" ||
    code === "740" ||
    /not ready|not connected/i.test(info)
  ) {
    return new Error(
      `Device not ready${code ? ` (errCode ${code})` : ""}. Unplug/replug Mantra MFS110, wait for READY, place finger, then Scan.`,
    );
  }
  if (code === "700" || /timeout/i.test(info)) {
    return new Error(
      "Capture timed out. Keep finger on the MFS110 sensor and Scan again.",
    );
  }
  if (/pidoptions|strictly adhere/i.test(info)) {
    return new Error(
      `RD rejected PidOptions (${info || "invalid"}). Update Mantra MFS110 L1 RD Service and retry.`,
    );
  }
  return new Error(
    info
      ? `${info}. Place finger firmly on Mantra MFS110 and Scan again.`
      : "Fingerprint capture failed. Place finger firmly on Mantra MFS110 and Scan again.",
  );
}

async function capturePid(rd: RdService, pidOptions: string): Promise<string> {
  const url = `${rd.baseUrl}${rd.capturePath}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: "CAPTURE",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          Accept: "text/xml",
        },
        body: pidOptions,
      },
      CAPTURE_TIMEOUT_MS,
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "Capture timed out waiting for RD Service. Place finger firmly on Mantra MFS110 and Scan again.",
      );
    }
    // Here we DID find READY earlier — a TypeError on capture is more suspicious.
    // Still soft-word it: could be service crashed mid-scan.
    throw new Error(
      "Could not reach RD Service for capture. Confirm Mantra RD Service is still running and READY, then Scan again.",
    );
  }

  if (!res.ok) {
    throw new Error(
      `RD capture HTTP ${res.status}. Is Mantra RD Service running?`,
    );
  }

  const xml = await res.text();
  if (!xml) throw new Error("Empty response from RD Service.");

  if (isValidSuccessfulPidCapture(xml)) return xml;

  if (/<PidData[\s>]|<Resp[\s>]/i.test(xml)) {
    throw errorFromPidXml(xml);
  }

  throw new Error(
    "Unexpected RD response. Confirm Capture works on https://rdtest.aadhaardevice.com/",
  );
}

/** Public: is scanner / RD ready? (for UI) */
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
      message: e?.message || "Fingerprint device not connected",
    };
  }
}

export const biometricService = {
  checkDevice: checkFingerprintDevice,

  /**
   * READY RD Service → CAPTURE (1 finger) → valid PidData or throw.
   */
  captureFingerprint: async (): Promise<string> => {
    const rd = await findReadyRdService();

    try {
      // Prefer L1 dual template for MFS110 L1; still fCount=1 (one finger)
      return await capturePid(rd, PID_OPTIONS_L1);
    } catch (e: any) {
      // Only swap template format if RD explicitly rejected PidOptions
      if (e?.message && /pidoptions|strictly adhere|ftype/i.test(e.message)) {
        return await capturePid(rd, PID_OPTIONS_FMR);
      }
      throw e;
    }
  },
};
