/**
 * UIDAI Registered Device (RD) fingerprint capture for RMS.
 *
 * Primary device: Mantra MFS110 L1
 * https://www.mantratec.com/Products/Fingerprint-Sensors/L1-Fingerprint-Scanner-MFS110
 *
 * Uses standard RD Service on 127.0.0.1 (ports 11100–11120).
 * Same protocol also works with Morpho/IDEMIA if that RD Service is still installed.
 */

/** L1-first PidOptions (Mantra MFS110 / UIDAI). No empty posh/otp/wadh. */
const PID_OPTIONS_VARIANTS = [
  `<PidOptions ver="1.0"><Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/></PidOptions>`,
  `<PidOptions ver="1.0"><Opts fCount="1" fType="2" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/><Demo></Demo><CustOpts></CustOpts></PidOptions>`,
  `<PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/></PidOptions>`,
  `<PidOptions ver="1.0"><Opts fCount="1" fType="1" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/></PidOptions>`,
];

/** Mantra docs: 11100–11120; keep Morpho common ports covered too */
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
  return /device not ready|not ready|re-initialized|being used by another|720|740|710|not registered|inactive/i.test(
    errInfo,
  );
}

function formatCaptureError(errInfo: string): Error {
  if (isDeviceNotReadyError(errInfo)) {
    return new Error(
      'Mantra MFS110 not ready. Unplug USB → wait 5 sec → plug again. Open Mantra RD Service dashboard and wait until status is Ready/Active. Internet needed for first registration. Then Scan again in RMS.',
    );
  }
  if (isPidOptionsError(errInfo)) {
    const err = new Error(errInfo) as Error & { pidOptionsReject?: boolean };
    err.pidOptionsReject = true;
    return err;
  }
  return new Error(
    `${errInfo}. Place finger firmly on the Mantra MFS110 scanner and try again.`,
  );
}

async function discoverRdService(
  scheme: 'https' | 'http',
  port: number,
): Promise<RdEndpoint | null> {
  const base = `${scheme}://127.0.0.1:${port}`;
  try {
    const res = await fetch(base, {
      method: 'RDSERVICE',
      headers: { Accept: 'text/xml, application/xml, */*' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!/READY|USED|status=/i.test(text) && !text.includes('<')) {
      // Some Mantra builds return JSON status on GET instead
      return null;
    }
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
    for (const method of ['DEVICEINFO', 'GET', 'POST'] as const) {
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
  await new Promise((r) => setTimeout(r, 400));
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
  if (!xmlResponse || (!xmlResponse.includes('<') && !xmlResponse.includes('{'))) {
    return null;
  }

  if (
    xmlResponse.includes('errCode="0"') ||
    xmlResponse.includes("errCode='0'")
  ) {
    return xmlResponse;
  }

  // Successful-looking PidData without explicit errCode
  if (
    /<PidData[\s>]/i.test(xmlResponse) &&
    !/errCode="[1-9]/i.test(xmlResponse)
  ) {
    return xmlResponse;
  }

  const errMatch = xmlResponse.match(/errInfo="([^"]*)"/i);
  const errInfo = errMatch?.[1] || 'Capture failed';
  throw formatCaptureError(errInfo);
}

async function tryCapture(url: string): Promise<string | null> {
  let lastPidReject: Error | null = null;

  for (const pidXml of PID_OPTIONS_VARIANTS) {
    const bodies: Array<{ body: string; contentType: string }> = [
      { body: pidXml, contentType: 'text/xml; charset=utf-8' },
      // Some RD builds accept wrapped JSON
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
          if (
            e?.message &&
            /Place finger|Capture failed|Mantra MFS110 not ready|device not ready/i.test(
              e.message,
            )
          ) {
            throw e;
          }
        }
      }
    }
  }

  if (lastPidReject) {
    throw new Error(
      `${lastPidReject.message}. RD Service rejected PidOptions — install latest Mantra MFS110 L1 RD Service and restart the PC.`,
    );
  }
  return null;
}

async function findReadyEndpoints(
  schemes: ReadonlyArray<'https' | 'http'>,
): Promise<RdEndpoint[]> {
  const found: RdEndpoint[] = [];
  const seen = new Set<string>();

  for (const scheme of schemes) {
    for (const port of RD_PORTS) {
      const ep = await discoverRdService(scheme, port);
      if (!ep) continue;
      const key = `${ep.scheme}:${ep.port}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(ep);
    }
  }

  // Fallback: assume default paths even if RDSERVICE verb unsupported
  if (!found.length) {
    for (const scheme of schemes) {
      for (const port of [11100, 11101, 11102, 11103, 11104, 11105]) {
        found.push({
          scheme,
          port,
          capturePath: '/rd/capture',
          infoPath: '/rd/info',
        });
      }
    }
  }

  return found;
}

export const biometricService = {
  /**
   * Capture one fingerprint via local Mantra MFS110 L1 RD Service.
   * Must run in Chrome/Edge on the PC where the scanner + RD Service are installed.
   */
  captureFingerprint: async (): Promise<string> => {
    const pageIsHttps =
      typeof window !== 'undefined' && window.location.protocol === 'https:';

    // RMS production is HTTPS → prefer https://127.0.0.1 RD
    const schemes = pageIsHttps
      ? (['https', 'http'] as const)
      : (['http', 'https'] as const);

    let lastCaptureError: Error | null = null;
    const endpoints = await findReadyEndpoints(schemes);

    for (const ep of endpoints) {
      const base = `${ep.scheme}://127.0.0.1:${ep.port}`;
      const url = `${base}${ep.capturePath.startsWith('/') ? ep.capturePath : `/${ep.capturePath}`}`;
      try {
        await wakeDeviceInfo(ep);
        const xml = await tryCapture(url);
        if (xml) return xml;
      } catch (e: any) {
        if (
          e?.message &&
          /Place finger|Capture failed|errInfo|PidOptions|RD Service rejected|not ready|Mantra MFS110/i.test(
            e.message,
          )
        ) {
          lastCaptureError = e;
        }
        console.log(`RD ${url} failed:`, e?.message || e);
      }
    }

    if (lastCaptureError) throw lastCaptureError;

    throw new Error(
      'Mantra RD Service not found on this PC. Install Mantra MFS110 L1 RD Service, plug in the MFS110 USB scanner, ensure RD status is Ready/Active, restart the PC, then open RMS on this same computer. Test: https://rdtest.aadhaardevice.com/ or https://127.0.0.1:11100',
    );
  },
};
