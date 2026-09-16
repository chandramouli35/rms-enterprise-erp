# RMS Weighbridge COM Bridge

## Optional IT fallback

Normal clients use **Connect Indicator** in RMS (Web Serial). This Node bridge is only for locked-down PCs.

Posts to: `POST /api/weighbridge/bridge-ingest/:plantId`

## Prerequisites

1. PuTTY already shows a stable weight on the weighbridge PC (same COM + baud).
2. **Close PuTTY** before starting the Bridge (only one app can use the port).
3. Node.js 18+ installed on the weighbridge PC.
4. RMS backend reachable from that PC (`apiBaseUrl`).

## Setup

```bash
cd weighbridge-bridge
copy config.example.json config.json
npm install
```

Edit `config.json`:

| Field | Example | Notes |
|--------|---------|--------|
| `apiBaseUrl` | `http://192.168.1.10:3000` | RMS backend URL (not the frontend Vite URL) |
| `plantId` | plant UUID | Same plant selected in RMS |
| `port` | `COM4` | From Device Manager / PuTTY |
| `baudRate` | `2400` or `9600` | Whichever worked in PuTTY |
| `bridgeKey` | optional | Must match backend `WEIGHBRIDGE_BRIDGE_SECRET` if set |

## Run

```bash
npm start
```

You should see lines like:

```
[bridge] → RMS 12540 kg
```

Then in RMS: **Weighbridge → Capture** — live weight updates; status **Connected**.

### Without hardware (dev)

```bash
npm run simulate
```

## Windows tip

Create a shortcut that runs `npm start` in this folder, or use Task Scheduler to start at login so the Bridge always runs on the weighbridge PC.
