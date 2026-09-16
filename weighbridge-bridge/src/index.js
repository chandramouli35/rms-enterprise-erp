/**
 * RMS Weighbridge COM Bridge
 *
 * Reads weight from the indicator serial port and POSTs to:
 *   POST {apiBaseUrl}/api/weighbridge/live/{plantId}
 *
 * Usage (on the weighbridge Windows PC):
 *   1. Copy config.example.json → config.json and edit COM / plantId / apiBaseUrl
 *   2. npm install
 *   3. Close PuTTY (only one app can use the COM port)
 *   4. npm start
 *
 * Dev without hardware:
 *   npm run simulate
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const EXAMPLE_PATH = path.join(__dirname, '..', 'config.example.json');

function loadConfig() {
  const cfgPath = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : EXAMPLE_PATH;
  const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const argv = process.argv.slice(2);
  if (argv.includes('--simulate')) raw.simulate = true;
  return {
    apiBaseUrl: String(raw.apiBaseUrl || 'http://localhost:3000').replace(/\/$/, ''),
    plantId: String(raw.plantId || '').trim(),
    bridgeKey: String(raw.bridgeKey || process.env.WEIGHBRIDGE_BRIDGE_SECRET || ''),
    port: String(raw.port || 'COM4'),
    baudRate: Number(raw.baudRate || 9600),
    dataBits: Number(raw.dataBits || 8),
    stopBits: Number(raw.stopBits || 1),
    parity: String(raw.parity || 'none').toLowerCase(),
    postIntervalMs: Number(raw.postIntervalMs || 800),
    simulate: !!raw.simulate,
  };
}

/** Extract a weight number from typical indicator serial text. */
function parseWeight(chunk) {
  const text = String(chunk || '');
  // Prefer patterns like WT:12345, = 012340 kg, Gross 12340
  const labeled = text.match(
    /(?:WT|NET|GROSS|WEIGHT|WGT)[^\d\-]*(-?\d+(?:\.\d+)?)/i,
  );
  if (labeled) return Number(labeled[1]);

  // Standalone integer groups (common continuous streams)
  const nums = [...text.matchAll(/-?\d{3,7}(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (!nums.length) return null;
  // Prefer the last plausible kg reading (< 200000 kg)
  for (let i = nums.length - 1; i >= 0; i--) {
    const n = nums[i];
    if (Number.isFinite(n) && Math.abs(n) < 200000) return n;
  }
  return null;
}

async function postLive(cfg, weightKg, meta = {}) {
  const url = `${cfg.apiBaseUrl}/api/weighbridge/bridge-ingest/${encodeURIComponent(cfg.plantId)}`;
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.bridgeKey) headers['X-Bridge-Key'] = cfg.bridgeKey;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      weightKg,
      port: cfg.port,
      baudRate: cfg.baudRate,
      stable: meta.stable !== false,
      raw: meta.raw,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`POST ${res.status}: ${body || res.statusText}`);
  }
  return res.json().catch(() => ({}));
}

function startSimulator(cfg) {
  console.log('[bridge] SIMULATE mode — posting fake weights (no COM port)');
  let w = 0;
  setInterval(async () => {
    // Idle zero most of the time; bump occasionally
    if (Math.random() < 0.15) w = 8000 + Math.floor(Math.random() * 40000);
    else if (Math.random() < 0.05) w = 0;
    try {
      await postLive(cfg, w, { raw: `SIM ${w}`, stable: true });
      console.log(`[bridge] → RMS ${w} kg`);
    } catch (err) {
      console.error('[bridge] post failed:', err.message || err);
    }
  }, cfg.postIntervalMs);
}

async function startSerial(cfg) {
  let SerialPort;
  try {
    ({ SerialPort } = require('serialport'));
  } catch (err) {
    console.error(
      '[bridge] serialport not installed. Run: npm install (inside weighbridge-bridge)',
    );
    throw err;
  }

  console.log(
    `[bridge] Opening ${cfg.port} @ ${cfg.baudRate} baud (${cfg.dataBits}${cfg.parity[0]}${cfg.stopBits})`,
  );

  const port = new SerialPort({
    path: cfg.port,
    baudRate: cfg.baudRate,
    dataBits: cfg.dataBits,
    stopBits: cfg.stopBits,
    parity: cfg.parity,
    autoOpen: false,
  });

  let buffer = '';
  let lastWeight = null;
  let lastPostAt = 0;

  const maybePost = async (weightKg, raw, force = false) => {
    if (weightKg == null || !Number.isFinite(weightKg)) return;
    lastWeight = weightKg;
    const now = Date.now();
    if (!force && now - lastPostAt < cfg.postIntervalMs) return;
    lastPostAt = now;
    try {
      await postLive(cfg, weightKg, { raw, stable: true });
      console.log(`[bridge] → RMS ${weightKg} kg  (raw: ${String(raw).trim().slice(0, 40)})`);
    } catch (err) {
      console.error('[bridge] post failed:', err.message || err);
    }
  };

  port.on('data', (buf) => {
    buffer += buf.toString('latin1');
    if (buffer.length > 500) buffer = buffer.slice(-200);
    const parts = buffer.split(/[\r\n=]+/);
    if (parts.length > 1) {
      buffer = parts.pop() || '';
      for (const part of parts) {
        const w = parseWeight(part);
        maybePost(w, part);
      }
    } else {
      const w = parseWeight(buffer);
      maybePost(w, buffer);
    }
  });

  port.on('error', (err) => {
    console.error('[bridge] serial error:', err.message || err);
  });

  await new Promise((resolve, reject) => {
    port.open((err) => (err ? reject(err) : resolve()));
  });

  console.log(
    '[bridge] Serial open. Posting to',
    `${cfg.apiBaseUrl}/api/weighbridge/live/${cfg.plantId}`,
  );
  console.log('[bridge] Keep this window open. Close PuTTY first if the port is busy.');

  // Heartbeat: re-post last known weight so RMS stays "Connected"
  setInterval(() => {
    if (lastWeight != null) maybePost(lastWeight, 'heartbeat', true);
  }, Math.max(cfg.postIntervalMs, 2000));
}

async function main() {
  const cfg = loadConfig();
  console.log('=== RMS Weighbridge COM Bridge ===');
  console.log(`API:   ${cfg.apiBaseUrl}`);
  console.log(`Plant: ${cfg.plantId}`);
  console.log(`COM:   ${cfg.port} @ ${cfg.baudRate}`);

  if (!cfg.plantId || cfg.plantId.includes('REPLACE')) {
    console.error(
      '[bridge] Set plantId in config.json to your plant UUID (from RMS plant selector / DB).',
    );
    process.exit(1);
  }

  if (cfg.simulate) {
    startSimulator(cfg);
    return;
  }

  try {
    await startSerial(cfg);
  } catch (err) {
    console.error('[bridge] Failed to open serial port:', err.message || err);
    console.error(
      '[bridge] Tips: close PuTTY, confirm COM in Device Manager, try baud 2400 or 9600.',
    );
    console.error('[bridge] Or run: npm run simulate');
    process.exit(1);
  }
}

main();
