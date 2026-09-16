/**
 * Browser Web Serial — fixed mill profile: COM4 @ 2400 8N1.
 * No baud/port picker in RMS. Chrome may ask once to allow the port;
 * after that reconnect is automatic (no selection).
 */

export const FIXED_WEIGHBRIDGE = {
  port: 'COM4',
  baudRate: 2400,
  dataBits: 8 as const,
  stopBits: 1 as const,
  parity: 'none' as const,
  /** Same as PuTTY: Flow control = None */
  flowControl: 'none' as const,
};

export type SerialOpenOptions = {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  flowControl?: 'none' | 'hardware';
};

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export function isSecureWeighbridgeContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext === true;
}

/** Extract kg from typical indicator serial text. */
export function parseIndicatorWeight(chunk: string): number | null {
  const text = String(chunk || '');
  const labeled = text.match(
    /(?:WT|NET|GROSS|WEIGHT|WGT)[^\d\-]*(-?\d+(?:\.\d+)?)/i,
  );
  if (labeled) {
    const n = Number(labeled[1]);
    return Number.isFinite(n) ? n : null;
  }
  const nums = [...text.matchAll(/-?\d{3,7}(?:\.\d+)?/g)].map((m) =>
    Number(m[0]),
  );
  for (let i = nums.length - 1; i >= 0; i--) {
    const n = nums[i];
    if (Number.isFinite(n) && Math.abs(n) < 200000) return n;
  }
  return null;
}

/** Always COM4 @ 2400 8N1 + flowControl none — matches working PuTTY profile. */
export function fixedSerialOptions(): SerialOpenOptions {
  return {
    baudRate: FIXED_WEIGHBRIDGE.baudRate,
    dataBits: FIXED_WEIGHBRIDGE.dataBits,
    stopBits: FIXED_WEIGHBRIDGE.stopBits,
    parity: FIXED_WEIGHBRIDGE.parity,
    flowControl: FIXED_WEIGHBRIDGE.flowControl,
  };
}

/** @deprecated use fixedSerialOptions — kept for call sites */
export function serialOptionsFromSettings(_settings?: unknown): SerialOpenOptions {
  return fixedSerialOptions();
}

type WeightCallback = (weightKg: number, raw: string) => void;
type ErrorCallback = (message: string) => void;

type SerialNav = Navigator & {
  serial: {
    requestPort: (options?: { filters?: unknown[] }) => Promise<any>;
    getPorts: () => Promise<any[]>;
  };
};

function portLooksLikeCom4(port: any): boolean {
  try {
    const info = port.getInfo?.() || {};
    const blob = JSON.stringify(info).toUpperCase();
    if (blob.includes('COM4')) return true;
  } catch {
    /* ignore */
  }
  return false;
}

async function openPort(port: any, serialOptions: SerialOpenOptions) {
  // Some browsers throw if already open
  try {
    await port.open(serialOptions);
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    if (!/already open/i.test(msg)) throw err;
  }
  return port;
}

/**
 * Opens the weighbridge serial port at fixed 2400 baud.
 * 1) Reuses a previously allowed port (no picker) — preferred
 * 2) Only if none allowed yet, Chrome shows a one-time port chooser (pick COM4 once)
 */
export async function connectWebSerialWeighbridge(opts: {
  serialOptions?: SerialOpenOptions;
  onWeight: WeightCallback;
  onError?: ErrorCallback;
  onDisconnected?: () => void;
  /** If true, never show picker — fail if no prior permission */
  existingOnly?: boolean;
}): Promise<{
  disconnect: () => Promise<void>;
  portLabel: string;
  usedPicker: boolean;
}> {
  if (!isWebSerialSupported()) {
    throw new Error(
      'Web Serial is not supported. Use Google Chrome or Microsoft Edge on this PC.',
    );
  }
  if (!isSecureWeighbridgeContext()) {
    throw new Error(
      'Browser blocked serial access. Open RMS via HTTPS (or localhost) on this weighbridge PC.',
    );
  }

  const serialOptions = opts.serialOptions || fixedSerialOptions();
  const nav = navigator as SerialNav;

  let port: any = null;
  let usedPicker = false;

  const existing = (await nav.serial.getPorts?.()) || [];
  if (existing.length) {
    const preferred =
      existing.find((p) => portLooksLikeCom4(p)) || existing[0];
    port = await openPort(preferred, serialOptions);
  } else if (!opts.existingOnly) {
    // One-time browser permission — operator must click COM4 in the list once
    usedPicker = true;
    port = await nav.serial.requestPort();
    await openPort(port, serialOptions);
  } else {
    throw new Error(
      'COM4 not authorized yet. Click Connect Indicator once to allow COM4.',
    );
  }

  const portLabel = FIXED_WEIGHBRIDGE.port;

  const decoder = new TextDecoderStream();
  const inputDone = port.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();

  let buffer = '';
  let stopped = false;
  let lastPosted = 0;

  const pump = async () => {
    try {
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        buffer += value;
        if (buffer.length > 500) buffer = buffer.slice(-200);

        const parts = buffer.split(/[\r\n=]+/);
        if (parts.length > 1) {
          buffer = parts.pop() || '';
          for (const part of parts) {
            const w = parseIndicatorWeight(part);
            if (w == null) continue;
            const now = Date.now();
            if (now - lastPosted < 200) continue;
            lastPosted = now;
            opts.onWeight(w, part);
          }
        } else {
          const w = parseIndicatorWeight(buffer);
          if (w != null) {
            const now = Date.now();
            if (now - lastPosted >= 200) {
              lastPosted = now;
              opts.onWeight(w, buffer);
            }
          }
        }
      }
    } catch (err: any) {
      if (!stopped) {
        opts.onError?.(err?.message || 'Serial read failed');
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* ignore */
      }
      opts.onDisconnected?.();
    }
  };

  pump();

  const disconnect = async () => {
    stopped = true;
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
    try {
      await inputDone;
    } catch {
      /* ignore */
    }
    try {
      await port.close();
    } catch {
      /* ignore */
    }
  };

  return { disconnect, portLabel, usedPicker };
}
