/**
 * UIDAI Registered Device (RD) fingerprint capture for RMS.
 *
 * Primary device: Mantra MFS110 L1
 * https://www.mantratec.com/Products/Fingerprint-Sensors/L1-Fingerprint-Scanner-MFS110
 *
 * CRITICAL: Never treat a response as success unless PidData has errCode=0
 * AND non-empty encrypted biometric Data. Device unplugged / not ready must FAIL.
 */

/** L1-first PidOptions (Mantra MFS110 / UIDAI). No empty posh/otp/wadh. */
const PID_OPTIONS_VARIANTS = [
  `<PidOptions ver="1.0"><Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/></PidOptions>`,
  `<PidOptions ver="1.0"><Opts fCount="1" fType="2" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/><Demo></Demo><CustOpts></CustOpts></PidOptions>`,
  `<PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/></PidOptions>`,
];

/** Mantra docs: 11100–11120 */
const RD_PORTS = Array.from({ length: 21 }, (_, i) => 11100 + i);

type RdEndpoint = {
  scheme: 'https' | 'http';
  port: number;
  capturePath: string;
  infoPath: string;
};

function isPidOptionsError(errInfo: string): boolean {
  return /pidoptions|strictly adhere|invalid value for (posh|ftype|fcount|format|pidver)/i.test(
    errInfo,
  );
}

function isDeviceNotReadyError(errInfo: string): boolean {
  return /device not ready|not ready|re-initialized|being used by another|not registered|inactive|not connected|no device|device not found/i.test(
    errInfo,
  );
}

/**
 * Strict success check — prevents false "captured" when device is unplugged.
 * Requires: PidData + Resp errCode exactly 0 + non-empty biometric Data payload.
 */
export function isValidSuccessfulPidCapture(xml: string): boolean {
  if (!xml || typeof xml !== 'string') return false;
  const text = xml.trim();
  if (!/<PidData[\s>]/i.test(text)) return false;

  // Any non-zero errCode anywhere in Resp → fail
  const errCodes = [...text.matchAll(/errCode\s*=\s*["']([^"']+)["']/gi)].map(
    (m) => m[1],
  );
  if (!errCodes.length) return false;
  if (!errCodes.every((c) => c === '0')) return false;

  const errInfo = text.match(/errInfo\s*=\s*["']([^"']*)["']/i)?.[1] || '';
  if (
    errInfo &&
    /fail|error|not ready|not connected|invalid|timeout|device/i.test(errInfo) &&
    !/^success$/i.test(errInfo.trim())
  ) {
    // Allow empty errInfo or explicit Success; reject failure phrases
    if (!/success|ok/i.test(errInfo)) return false;
  }

  // Encrypted biometric block must be present and non-trivial
  const dataMatch = text.match(
    /<Data\b[^>]*>([^<]{32,})<\/Data>/i,
  );
  if (!dataMatch?.[1]?.trim()) return false;

  // Optional: if nmPoints present for FMR, must be > 0
  const nm = text.match(/nmPoints\s*=\s*["'](\d+)["']/i);
  if (nm && Number(nm[1]) === 0) return false;

  // fCount if present should be >= 1 for fingerprint capture
  const fc = text.match(/\bfCount\s*=\s*["'](\d+)["']/i);
  if (fc && Number(fc[1]) < 1) return false;

  return true;
}

function formatCaptureError(errInfo: string, errCode?: string): Error {
  const info = errInfo || 'Capture failed';
  if (isDeviceNotReadyError(info) || errCode === '720' || errCode === '740') {
    return new Error(
      'Fingerprint device not ready or not plugged in. Connect Mantra MFS110 USB, wait until Mantra RD Service shows Ready/Active, then Scan again.',
    );
  }
  if (isPidOptionsError(info)) {
    const err = new Error(info) as Error & { pidOptionsReject?: boolean };
    err.pidOptionsReject = true;
    return err;
  }
  return new Error(
    `${info}. Place finger firmly on the Mantra MFS110 scanner and try again.`,
  );
}

/** status="READY" only — do NOT match NOTREADY via /READY/ */
function rdServiceIsReady(xml: string): boolean {
  if (/status\s*=\s*["']READY["']/i.test(xml)) return true;
  if (/status\s*=\s*["']USED["']/i.test(xml)) return true;
  // JSON-style Mantra status
  if (/"deviceStatus"\s*:\s*"ACTIVE"/i.test(xml)) return true;
  if (/"status"\s*:\s*"READY"/i.test(xml)) return true;
  return false;
}

async function discoverRdService(
  scheme: 'https' | 'http',
  port: number,
): Promise<RdEndpoint | null> {
  const base = `${scheme}://127.0.0.1:${port}`;
  try {
    const res = await fetch(base, {
      method: 'RDSERVICE',
      headers: { Accept: 'text/xml, application/xml, application/json, */*' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    if (!rdServiceIsReady(text) && !/<RDService/i.test(text)) return null;
    // If RDService XML present but not ready, still return endpoint so capture can return real error
    const capture =
      text.match(/id=["']CAPTURE["'][^>]*path=["']([^"']+)["']/i)?.[1] ||
      '/rd/capture';
    const info =
      text.match(/id=["']DEVICEINFO["'][^>]*path=["']([^"']+)["']/i)?.[1] ||
      '/rd/info';
    return { scheme, port, capturePath: capture, infoPath: info };
  } catch {
    return null;
  }
}

async function wakeDeviceInfo(ep: RdEndpoint): Promise<void> {
  const base = `${ep.scheme}://127.0.0.1:${ep.port}`;
  const paths = [ep.infoPath, '/rd/info', '/getDeviceInfo'];
  for (const path of paths) {
    for (const method of ['DEVICEINFO', 'GET'] as const) {
      try {
        await fetch(`${base}${path}`, {
          method,
          headers: { Accept: 'text/xml, application/json, */*' },
        });
      } catch {
        /* next */
      }
    }
  }
  await new Promise((r) => setTimeout(r, 300));
}

async function tryCaptureWithBody(
  url: string,
  method: 'CAPTURE' | 'POST',
  body: string,
  contentType: string,
): Promise<string | null> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': contentType,
      Accept: 'text/xml, application/xml, */*',
    },
    body,
  });
  if (!response.ok) return null;
  const xmlResponse = await response.text();
  if (!xmlResponse || !xmlResponse.includes('<')) return null;

  if (isValidSuccessfulPidCapture(xmlResponse)) {
    return xmlResponse;
  }

  // Real RD error response
  if (/<PidData[\s>]|<Resp[\s>]/i.test(xmlResponse)) {
    const errCode = xmlResponse.match(/errCode\s*=\s*["']([^"']+)["']/i)?.[1];
    const errInfo =
      xmlResponse.match(/errInfo\s*=\s*["']([^"']*)["']/i)?.[1] ||
      'Fingerprint capture failed';
    if (errCode && errCode !== '0') {
      throw formatCaptureError(errInfo, errCode);
    }
    // errCode 0 but missing Data / invalid payload → treat as failure
    throw new Error(
      'Fingerprint capture returned empty biometric data. Ensure Mantra MFS110 is plugged in, finger is on the sensor, and RD Service shows Ready — then Scan again.',
    );
  }

  return null;
}

async function tryCapture(url: string): Promise<string | null> {
  let lastPidReject: Error | null = null;
  let lastHardError: Error | null = null;

  for (const pidXml of PID_OPTIONS_VARIANTS) {
    const bodies: Array<{ body: string; contentType: string }> = [
      { body: pidXml, contentType: 'text/xml; charset=utf-8' },
      {
        body: JSON.stringify({ PidOptions: pidXml }),
        contentType: 'application/json',
      },
    ];
    for (const { body, contentType } of bodies) {
      for (const method of ['CAPTURE', 'POST'] as const) {
        try {
          const xml = await tryCaptureWithBody(url, method, body, contentType);
          if (xml) return xml;
        } catch (e: any) {
          if (e?.pidOptionsReject) {
            lastPidReject = e;
            continue;
          }
          if (e instanceof Error) {
            lastHardError = e;
            // Device / finger errors: stop trying variants on this URL
            if (
              /not ready|not plugged|empty biometric|Place finger|Capture failed/i.test(
                e.message,
              )
            ) {
              throw e;
            }
          }
        }
      }
    }
  }

  if (lastHardError) throw lastHardError;
  if (lastPidReject) {
    throw new Error(
      `${lastPidReject.message}. Update Mantra MFS110 L1 RD Service and restart the PC.`,
    );
  }
  return null;
}

async function preferredSchemes(): Promise<ReadonlyArray<'https' | 'http'>> {
  const pageIsHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  return pageIsHttps ? (['https', 'http'] as const) : (['http', 'https'] as const);
}

async function findReadyEndpoints(
  schemes: ReadonlyArray<'https' | 'http'>,
): Promise<RdEndpoint[]> {
  const found: RdEndpoint[] = [];
  const seen = new Set<string>();

  for (const scheme of schemes) {
    const ports = [11100, 11101, 11102, 11103, ...RD_PORTS.filter((p) => p > 11103)];
    for (const port of ports) {
      const ep = await discoverRdService(scheme, port);
      if (!ep) continue;
      const key = `${ep.scheme}:${ep.port}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(ep);
    }
  }

  // Do NOT invent fake endpoints when RD Service is down — that caused false paths.
  return found;
}

function parseDeviceInfoPayload(text: string): {
  connected: boolean;
  model?: string;
  serial?: string;
  dpId?: string;
  rawSnippet?: string;
} {
  if (!text) return { connected: false };

  const errCode = text.match(/errCode\s*=\s*["']([^"']+)["']/i)?.[1];
  if (errCode && errCode !== '0') {
    return { connected: false, rawSnippet: text.slice(0, 200) };
  }

  // DeviceInfo XML typically has DeviceInfo / mi / dc / dpId / rdsId
  const hasDeviceInfo =
    /<DeviceInfo[\s>]/i.test(text) ||
    /dpId\s*=/i.test(text) ||
    /"serialNumber"/i.test(text) ||
    /"deviceStatus"\s*:\s*"ACTIVE"/i.test(text);

  if (!hasDeviceInfo && !rdServiceIsReady(text)) {
    // NOTREADY / no device markers
    if (/NOTREADY|not ready|no device|not connected/i.test(text)) {
      return { connected: false, rawSnippet: text.slice(0, 200) };
    }
  }

  const model =
    text.match(/\bmi\s*=\s*["']([^"']+)["']/i)?.[1] ||
    text.match(/"model"\s*:\s*"([^"]+)"/i)?.[1];
  const serial =
    text.match(/\bdc\s*=\s*["']([^"']+)["']/i)?.[1] ||
    text.match(/"serialNumber"\s*:\s*"([^"]+)"/i)?.[1];
  const dpId =
    text.match(/\bdpId\s*=\s*["']([^"']+)["']/i)?.[1] ||
    text.match(/"dpId"\s*:\s*"([^"]+)"/i)?.[1];

  // Connected = we got DeviceInfo-like payload OR RD READY with device fields
  const connected =
    hasDeviceInfo ||
    (!!model && !!dpId) ||
    /"deviceStatus"\s*:\s*"ACTIVE"/i.test(text);

  return {
    connected,
    model,
    serial,
    dpId,
    rawSnippet: text.slice(0, 240),
  };
}

async function fetchDeviceInfoXml(ep: RdEndpoint): Promise<string | null> {
  const base = `${ep.scheme}://127.0.0.1:${ep.port}`;
  const paths = [ep.infoPath, '/rd/info', '/getDeviceInfo'];
  for (const path of paths) {
    for (const method of ['DEVICEINFO', 'GET', 'POST'] as const) {
      try {
        const res = await fetch(`${base}${path}`, {
          method,
          headers: { Accept: 'text/xml, application/json, */*' },
        });
        if (!res.ok) continue;
        const text = await res.text();
        if (text && text.length > 10) return text;
      } catch {
        /* next */
      }
    }
  }
  return null;
}

export type FingerprintDeviceStatus = {
  /** RD Service process reachable on this PC */
  rdServiceRunning: boolean;
  /** Scanner appears connected/registered to RD Service */
  deviceConnected: boolean;
  ready: boolean;
  scheme?: string;
  port?: number;
  model?: string;
  serial?: string;
  message: string;
};

/**
 * Check if Mantra RD Service is up AND device looks connected.
 * MUST run in the browser on the weighbridge/supervisor PC (not from Nest backend).
 * Backend servers cannot see client USB / 127.0.0.1 RD Service.
 */
export async function checkFingerprintDevice(): Promise<FingerprintDeviceStatus> {
  const schemes = await preferredSchemes();
  const endpoints = await findReadyEndpoints(schemes);

  if (!endpoints.length) {
    return {
      rdServiceRunning: false,
      deviceConnected: false,
      ready: false,
      message:
        'Mantra RD Service not running on this PC. Install MFS110 L1 RD Service and open RMS on the PC where the scanner is plugged in.',
    };
  }

  for (const ep of endpoints) {
    // RDSERVICE discovery answered → service is running
    const infoXml = await fetchDeviceInfoXml(ep);
    if (!infoXml) {
      continue;
    }
    const parsed = parseDeviceInfoPayload(infoXml);
    if (parsed.connected) {
      return {
        rdServiceRunning: true,
        deviceConnected: true,
        ready: true,
        scheme: ep.scheme,
        port: ep.port,
        model: parsed.model,
        serial: parsed.serial,
        message: `Scanner connected${parsed.model ? ` (${parsed.model})` : ''} on ${ep.scheme}://127.0.0.1:${ep.port}`,
      };
    }
  }

  // Service up but device missing / not ready
  const ep = endpoints[0];
  return {
    rdServiceRunning: true,
    deviceConnected: false,
    ready: false,
    scheme: ep.scheme,
    port: ep.port,
    message:
      'RD Service is running but Mantra MFS110 is not connected or not ready. Plug in the USB scanner and wait until RD shows Ready/Active.',
  };
}

export const biometricService = {
  /** Same as checkFingerprintDevice — for UI “is device plugged in?” */
  checkDevice: checkFingerprintDevice,

  /**
   * Capture one fingerprint via local Mantra MFS110 L1 RD Service.
   * Checks device connection first — never fake success if unplugged.
   */
  captureFingerprint: async (): Promise<string> => {
    const status = await checkFingerprintDevice();
    if (!status.rdServiceRunning) {
      throw new Error(status.message);
    }
    if (!status.deviceConnected || !status.ready) {
      throw new Error(status.message);
    }

    const schemes = await preferredSchemes();
    let lastCaptureError: Error | null = null;
    const endpoints = await findReadyEndpoints(schemes);

    for (const ep of endpoints) {
      const base = `${ep.scheme}://127.0.0.1:${ep.port}`;
      const path = ep.capturePath.startsWith('/')
        ? ep.capturePath
        : `/${ep.capturePath}`;
      const url = `${base}${path}`;
      try {
        await wakeDeviceInfo(ep);
        const xml = await tryCapture(url);
        if (xml && isValidSuccessfulPidCapture(xml)) {
          return xml;
        }
        if (xml) {
          throw new Error(
            'Fingerprint capture returned invalid data. Plug in Mantra MFS110, place finger on sensor, and try again.',
          );
        }
      } catch (e: any) {
        if (e?.message)
          lastCaptureError = e instanceof Error ? e : new Error(String(e));
        console.log(`RD ${url} failed:`, e?.message || e);
      }
    }

    if (lastCaptureError) throw lastCaptureError;

    throw new Error(
      'Fingerprint capture failed. Ensure Mantra MFS110 is plugged in, RD Service Ready/Active, finger on sensor. Test: https://rdtest.aadhaardevice.com/',
    );
  },
};
