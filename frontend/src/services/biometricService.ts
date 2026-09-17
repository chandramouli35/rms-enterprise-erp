/**
 * UIDAI / Morpho RD Service capture.
 * Newer L1 RD (post-1.1.3) rejects empty posh/otp/wadh and often requires fType=2.
 */

/** Preferred → fallback PidOptions (strict L1 first). */
const PID_OPTIONS_VARIANTS = [
  // L1 Morpho / IDEMIA — FMR+FIR, posh UNKNOWN (no empty attrs)
  `<PidOptions ver="1.0"><Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/></PidOptions>`,
  // L1 alternate with Demo/CustOpts wrappers some RD builds expect
  `<PidOptions ver="1.0"><Opts fCount="1" fType="2" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/><Demo></Demo><CustOpts></CustOpts></PidOptions>`,
  // Older FMR-only devices
  `<PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/></PidOptions>`,
  // FIR-only
  `<PidOptions ver="1.0"><Opts fCount="1" fType="1" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" posh="UNKNOWN" env="P"/></PidOptions>`,
];

/** Common Morpho / Mantra / Precision RD Service local ports */
const RD_PORTS = [11100, 11101, 11102, 11103, 11104, 11105];

function isPidOptionsError(errInfo: string): boolean {
  return /pidoptions|strictly adhere|invalid value for (posh|ftype|fcount|format|pidver)/i.test(
    errInfo,
  );
}

async function tryCaptureWithBody(
  url: string,
  method: 'CAPTURE' | 'POST',
  body: string,
): Promise<string | null> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      Accept: 'text/xml',
    },
    body,
  });
  if (!response.ok) return null;
  const xmlResponse = await response.text();
  if (!xmlResponse || !xmlResponse.includes('<')) return null;

  if (
    xmlResponse.includes('errCode="0"') ||
    xmlResponse.includes("errCode='0'")
  ) {
    return xmlResponse;
  }

  const errMatch = xmlResponse.match(/errInfo="([^"]*)"/i);
  const errInfo = errMatch?.[1] || 'Capture failed';
  if (isPidOptionsError(errInfo)) {
    // Let caller try next PidOptions variant — do not treat as final finger error yet
    const err = new Error(errInfo) as Error & { pidOptionsReject?: boolean };
    err.pidOptionsReject = true;
    throw err;
  }
  throw new Error(
    `${errInfo}. Place finger firmly on the Morpho scanner and try again.`,
  );
}

async function tryCapture(url: string): Promise<string | null> {
  let lastPidReject: Error | null = null;

  for (const pidXml of PID_OPTIONS_VARIANTS) {
    for (const method of ['CAPTURE', 'POST'] as const) {
      try {
        const xml = await tryCaptureWithBody(url, method, pidXml);
        if (xml) return xml;
      } catch (e: any) {
        if (e?.pidOptionsReject) {
          lastPidReject = e;
          continue; // next method / PidOptions
        }
        if (e?.message && /Place finger|Capture failed|errInfo/i.test(e.message)) {
          throw e;
        }
        // wrong method / network — try next
      }
    }
  }

  if (lastPidReject) {
    throw new Error(
      `${lastPidReject.message}. RD Service rejected PidOptions — use latest Windows L1 RD from rdserviceonline.com and restart the PC.`,
    );
  }
  return null;
}

export const biometricService = {
  captureFingerprint: async (): Promise<string> => {
    const pageIsHttps =
      typeof window !== 'undefined' && window.location.protocol === 'https:';

    // Prefer https://127.0.0.1 when RMS is on HTTPS (mixed-content safe for many RD installs)
    const schemes = pageIsHttps
      ? (['https', 'http'] as const)
      : (['http', 'https'] as const);

    let lastCaptureError: Error | null = null;

    for (const scheme of schemes) {
      for (const port of RD_PORTS) {
        const url = `${scheme}://127.0.0.1:${port}/rd/capture`;
        try {
          const xml = await tryCapture(url);
          if (xml) return xml;
        } catch (e: any) {
          if (
            e?.message &&
            /Place finger|Capture failed|errInfo|PidOptions|RD Service rejected/i.test(
              e.message,
            )
          ) {
            lastCaptureError = e;
          }
          console.log(`RD ${scheme}://127.0.0.1:${port} failed:`, e?.message || e);
        }
      }
    }

    if (lastCaptureError) throw lastCaptureError;

    throw new Error(
      'RD Service not found on this PC. Install latest Morpho/IDEMIA Windows L1 RD Service (not 1.1.3), plug in the Morpho USB scanner, restart the PC, then open RMS again on this same computer. Test: https://127.0.0.1:11100',
    );
  },
};
