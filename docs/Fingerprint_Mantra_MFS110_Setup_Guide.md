# Mantra MFS110 L1 Fingerprint — Setup Guide for RMS

**Who this is for:** Mill office / supervisor PCs that scan fingerprints in Rice Mill Management System (RMS).

**Device (current):** [Mantra MFS110 L1 Fingerprint Scanner](https://www.mantratec.com/Products/Fingerprint-Sensors/L1-Fingerprint-Scanner-MFS110)  
**Software:** Mantra **MFS110 L1 RD Service** (Windows)

RMS is on **HTTPS**, so RD Service must work with `https://127.0.0.1` (or Mantra’s HTTPS test page).

---

## How RMS Scan works (simple)

```
1. Browser asks Mantra RD Service on this PC: are you READY?
2. If READY → send CAPTURE + finger on MFS110
3. Success only if RD returns real biometric Data (errCode=0)
4. Otherwise show the RD error (NOTREADY / timeout / etc.)
```

No backend USB check (server cannot see the client scanner). All of this runs in Chrome/Edge on the mill PC.

## One-time setup (each PC that will scan)

### 1. What you need

| Item | Details |
|------|---------|
| Computer | Windows 10/11 PC (same PC as RMS browser) |
| Scanner | **Mantra MFS110 L1** |
| Software | **Mantra MFS110 L1 RD Service** (official Mantra download) |
| Browser | **Chrome** or **Edge** |
| Internet | Required for first device registration / Ready status |
| RMS site | **HTTPS** |

**Rule:** Fingerprint only works on the PC where MFS110 + Mantra RD Service are installed. Not from phone / remote PC without the device.

### 2. Install Mantra MFS110 RD Service

1. Download **MFS110 Windows L1 RD Service** from Mantra official support / RD downloads (vendor or IT).  
2. Run installer **as Administrator**.  
3. Finish → **restart the PC**.  
4. Plug in **MFS110** USB (prefer a direct rear USB port, not a cheap hub).  
5. Wait for registration popup / Mantra dashboard → status **Ready** / **Active**.  
   - PC must reach Mantra management domains (e.g. `aadhaardevice.com`) on first register.

### 3. Confirm RD Service is running

**Option A — Mantra HTTPS test (best for HTTPS RMS):**  
Open [https://rdtest.aadhaardevice.com/](https://rdtest.aadhaardevice.com/)

**Option B — local:**  
`https://127.0.0.1:11100` or `http://127.0.0.1:11100`  
(Mantra uses ports **11100–11120**)

On the test page select:

| Setting | Value |
|--------|--------|
| Device | **L1** / Mantra MFS110 |
| comMode | **https** (because RMS is HTTPS) |
| Host | **127.0.0.1** |
| Port | **11100** (or the port shown as Ready) |

Then click in order:

1. **RD Service** → Ready  
2. **DeviceInfo** → shows MFS110 / serial  
3. **Capture** → finger on glass → success XML  

Only after test-page Capture works, use RMS Scan.

### 4. Test in RMS

1. Chrome / Edge → RMS (HTTPS) → log in.  
2. Any Scan screen (Users & Roles, Staff Unloader, Paddy Inward, Gate Pass, etc.).  
3. Click **Scan** → success.

---

## Where fingerprint is used in RMS

| Place in RMS | What to do |
|--------------|------------|
| **Users & Roles → Add User** (Supervisor) | Finger 1 + Finger 2 |
| **Users & Roles → Transfer User** | Re-register 2 fingers |
| **Staff → Unloader** | Two fingerprint scans required |
| **Paddy Inward** | Scan at tare / confirm when asked |
| **Gate Pass** | Scan when closing / confirming |
| Other modules | Only when Scan is shown |

---

## If Scan fails

| Problem | Fix |
|---------|-----|
| `127.0.0.1:11100` connection refused | Mantra RD Service not installed / not running. Install + restart. Check `services.msc` → Mantra RD Service → Start. |
| HTTPS site, HTTP RD only | Use HTTPS RD / test at [rdtest.aadhaardevice.com](https://rdtest.aadhaardevice.com/) with **comMode = https**. |
| Device not ready | Unplug/replug MFS110. Wait until Mantra dashboard = Ready/Active. Need internet for first register. |
| Invalid PidOptions | Hard refresh RMS (`Ctrl+Shift+R`). Update Mantra RD Service to latest. |
| Capture failed | Clean sensor, firm finger, close other biometric apps. |
| Works on one PC only | Install RD Service + register MFS110 on **each** PC (serial usually tied per activation rules). |

### Mantra support

- Product page: [MFS110 L1](https://www.mantratec.com/Products/Fingerprint-Sensors/L1-Fingerprint-Scanner-MFS110)  
- Support: servico@mantratec.com / Mantra support portal  
- Allow outbound access to Mantra management / `aadhaardevice.com` if registration stuck  

---

## Quick summary

1. Install **Mantra MFS110 L1 RD Service** → restart.  
2. Plug **MFS110** → wait until **Ready/Active**.  
3. Prove Capture on [https://rdtest.aadhaardevice.com/](https://rdtest.aadhaardevice.com/) with **L1 + https**.  
4. Open RMS HTTPS → **Scan**.  

RMS code uses the standard UIDAI RD capture API — no separate Morpho software needed for Mantra mills.

---

## Note (old Morpho devices)

If a mill still has Morpho/IDEMIA MSO 1300 E3 RD, the same RMS Scan button can still work if that PC has Morpho RD Service running on 127.0.0.1. New deployments should use **Mantra MFS110** only.
