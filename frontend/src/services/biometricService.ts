const PID_OPTIONS = `<PidOptions ver="1.0">
  <Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="10000" otp="" wadh="" posh="" env="P" />
</PidOptions>`;

/** Common Morpho / Mantra / Precision RD Service local ports */
const RD_PORTS = [11100, 11101, 11102, 11103, 11104, 11105];

async function tryCapture(url: string): Promise<string | null> {
  try {
    // Most RD services expect CAPTURE; some accept POST
    for (const method of ['CAPTURE', 'POST'] as const) {
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'text/xml' },
          body: PID_OPTIONS,
        });
        if (!response.ok) continue;
        const xmlResponse = await response.text();
        if (!xmlResponse || !xmlResponse.includes('<')) continue;
        if (
          xmlResponse.includes('errCode="0"') ||
          xmlResponse.includes("errCode='0'")
        ) {
          return xmlResponse;
        }
        // Device responded but capture failed (finger not placed / device busy)
        const errMatch = xmlResponse.match(/errInfo="([^"]*)"/i);
        const errInfo = errMatch?.[1] || 'Capture failed';
        throw new Error(
          `${errInfo}. Place finger firmly on the Morpho scanner and try again.`,
        );
      } catch (e: any) {
        if (e?.message && /Place finger|Capture failed|errInfo/i.test(e.message)) {
          throw e;
        }
        // wrong method / network — try next
      }
    }
  } catch (e: any) {
    if (e?.message && /Place finger|Capture failed|errInfo/i.test(e.message)) {
      throw e;
    }
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
          if (e?.message && /Place finger|Capture failed|errInfo/i.test(e.message)) {
            lastCaptureError = e;
          }
          console.log(`RD ${scheme}://127.0.0.1:${port} failed:`, e?.message || e);
        }
      }
    }

    if (lastCaptureError) throw lastCaptureError;

    throw new Error(
      'RD Service not found on this PC. Install Morpho RD Service, plug in the Morpho USB scanner, restart the PC, then open RMS again on this same computer. Test in browser: https://127.0.0.1:11100',
    );
  },
};
