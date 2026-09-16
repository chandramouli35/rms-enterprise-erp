# Physical Weighbridge — Setup Guide for RMS

**Who this is for:** Mill office / weighbridge computers that capture live weight into Rice Mill Management System (RMS).

**No extra software install for normal use.** Staff open RMS in Chrome or Edge and click **Connect COM4 @ 2400**.

---

## Client path (recommended) — fixed COM4 @ 2400

1. Plug the indicator cable into the weighbridge Windows PC.  
2. Open **Chrome** or **Edge** → RMS → **Weighbridge → Capture**.  
3. Click **Connect COM4 @ 2400**.

- Port and baud are **fixed** (no daily selection).  
- Chrome may ask **once** to allow COM4; after that it reconnects with no picker.  
- Keep that tab open while weighing.

### Requirements

| Need | Detail |
|------|--------|
| Browser | **Chrome** or **Edge** (not Firefox / Safari) |
| Site | RMS opened with **https://** (or localhost for testing) |
| PC | The one physically cabled to the indicator |
| Profile | **COM4 @ 2400** (locked in RMS) |

### If Connect fails

1. Close **PuTTY** (port must be free).  
2. Confirm Device Manager still shows **COM4**.  
3. Click Connect again — if Chrome asks, choose **COM4** only (one time).
---

## Optional: first-time hardware check (IT only)

If Connect fails, confirm the cable with **PuTTY** once (Serial, COM from Device Manager, baud 2400 then 9600, 8N1). When PuTTY shows numbers, close PuTTY and use **Connect Indicator** in RMS.

> Our weighbridge COM port = **COM______** · Baud that works = **________**

---

## Optional IT fallback — Node COM Bridge

Only if a PC cannot use Web Serial (locked browser policy, etc.). See folder `weighbridge-bridge/` in the RMS repo. Normal mills should **not** need this.

---

## Test live capture

1. Connect Indicator (status **Connected**).  
2. Put a vehicle / test weight on the platform.  
3. Confirm RMS kg matches the indicator.  
4. Use **Capture Wt** / **Tare** as usual.

Setup is complete when live weight in RMS matches the indicator.
