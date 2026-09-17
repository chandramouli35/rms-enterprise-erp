# Morpho Fingerprint — Setup Guide for RMS

**Who this is for:** Mill office / supervisor computers that scan fingerprints in Rice Mill Management System (RMS).

**Device:** Morpho / IDEMIA USB fingerprint scanner + Morpho **RD Service** (small background program).

Unlike the weighbridge (browser-only), fingerprint **needs Morpho RD Service installed once** on each PC that will scan. After that, staff only click **Scan** in RMS.

---

## Important — UIDAI notice (upgrade RD Service)

UIDAI has **discontinued support for RD Service Version 1.1.3**.

| Action | Detail |
|--------|--------|
| What to do | Upgrade to the **latest** Morpho / IDEMIA RD Service from the official Downloads section |
| Official downloads | [rdserviceonline.com/pages/downloads](https://rdserviceonline.com/pages/downloads) |
| Help line | Morpho / IDEMIA toll-free: **0806-936-8000** |
| Does RMS need a code change? | **No** — RMS already talks to whatever latest RD Service is running on the PC |

### Upgrade steps (each weighbridge / supervisor PC)

1. Close RMS browser tabs on that PC.  
2. Uninstall old **RD Service 1.1.3** (Windows → Apps / Control Panel), **or** run the new installer (it often upgrades in place).  
3. Download the correct package from Downloads:
   - **Windows L1 RD (https/127.0.0.1)** — preferred when RMS is on `https://`  
   - **Windows L1 RD (https/localhost)** — alternate HTTPS install  
   - **Windows L1 RD (http)** — only if your mill still uses plain HTTP  
4. Install → **restart the PC**.  
5. Plug Morpho USB back in.  
6. Confirm RD Service is running (icon near clock, or open `https://127.0.0.1:11100` / `http://127.0.0.1:11100`).  
7. Open RMS → click **Scan** → place finger → success.

> If Scan fails after upgrade, tell support: “We upgraded past RD 1.1.3 from rdserviceonline.com Downloads; capture still fails on ports 11100–11105.”

---

## Client path (daily use) — after one-time setup

1. Morpho scanner plugged into USB on this PC.  
2. Open **Chrome** or **Edge** → log into RMS on **this same PC**.  
3. On any screen that asks for fingerprint, click **Scan** / **Scan Finger**.  
4. Place finger **firmly and flat** on the Morpho glass → hold 1–2 seconds.  
5. Success = green tick / “Fingerprint captured”.

Keep the scanner plugged in while supervisors work. No daily port or settings to change.

---

## One-time setup (IT / first PC) — do this once per computer

### 1. What you need

| Item | Details |
|------|---------|
| Computer | Windows PC (same PC where staff open RMS) |
| Scanner | Morpho / IDEMIA USB fingerprint device (L1 preferred) |
| Cable | USB cable that came with the device |
| Software | **Latest** Morpho RD Service (not 1.1.3) from [Downloads](https://rdserviceonline.com/pages/downloads) |
| Browser | **Chrome** or **Edge** |

**Rule:** Fingerprint works only on the PC where the scanner + RD Service are installed. It will **not** work from a phone or a remote PC without the device.

### 2. Plug in the Morpho

1. Turn on the Windows PC.  
2. Plug Morpho USB into the PC.  
3. Wait 10–20 seconds (light on / Windows may install driver).  

If nothing happens → try another USB port.

### 3. Install Morpho RD Service (latest)

RMS does **not** talk to the scanner directly. It talks to **RD Service** on this PC.

1. Download the **latest** Windows L1 RD installer (see UIDAI section above — **do not** keep 1.1.3).  
2. Run the `.exe` → Next / Install / Yes if Windows asks.  
3. Finish → **restart the PC** once.  

After restart, RD Service usually starts automatically (icon near the Windows clock).

### 4. Confirm RD Service is running

On the **same PC**, open a browser and try:

`https://127.0.0.1:11100`  
or `http://127.0.0.1:11100`  
or `http://127.0.0.1:11101`

If something responds (even a blank page), RD Service is alive.

**RMS checks these ports automatically:** `11100`–`11105`.

If none work → RD Service not installed / not running. Reinstall **latest** RD Service or ask IT to start it.

### 5. Test one scan in RMS

1. Chrome / Edge → open RMS → log in.  
2. Go to a fingerprint screen, for example:
   - **Users & Roles → Add User** (Supervisor → Scan Finger 1 / Finger 2)  
   - **Staff** (Unloader → two fingerprints)  
   - **Paddy Inward** / **Gate Pass** when Scan is shown  
3. Click **Scan** → place finger → success.

Setup is complete when one scan succeeds on that PC.

---

## Where fingerprint is used in RMS

| Place in RMS | What to do |
|--------------|------------|
| **Users & Roles → Add User** (Supervisor) | Register **Finger 1** and **Finger 2** |
| **Users & Roles → Transfer User** (Supervisor) | Re-register 2 fingers for the new mill |
| **Staff → Unloader** | Two fingerprint scans required |
| **Paddy Inward** | Scan at tare / confirm when asked |
| **Gate Pass** | Scan when closing / confirming (as per process) |
| Other modules | Only when a Scan / Fingerprint button is shown |

---

## How to place the finger

- Clean, dry finger  
- Press **gently but firmly** on the glass  
- Cover the sensor (not only the nail tip)  
- Don’t move until success  
- If it fails: wipe glass, same finger again  

Supervisors: register **two different fingers** (e.g. left thumb + right thumb).

---

## If Scan fails

| Problem | Fix |
|---------|-----|
| UIDAI / “upgrade RD Service” notice | Install **latest** RD from [Downloads](https://rdserviceonline.com/pages/downloads) — remove 1.1.3 |
| “Invalid PidOptions… strictly adhere to spec” | RMS sends L1-compatible PidOptions. Refresh RMS (hard refresh). Confirm **latest Windows L1 RD** is installed and PC restarted. Prefer **https/127.0.0.1** build if RMS is on HTTPS. |
| “RD Service not found” | Install / start latest Morpho RD Service. Restart PC. Plug Morpho USB. |
| Button does nothing | Use the **same PC** as the scanner. Not phone / other office PC. |
| Capture failed | Clean sensor, press firmly, try again. Close other fingerprint apps. |
| Works on one PC, not another | Install scanner + latest RD Service on **each** PC that needs fingerprint. |
| Antivirus blocks | Allow Morpho RD Service / localhost ports **11100–11105**. |
| Remote desktop | Scan must run on the PC that has the physical Morpho device. |

---

## Daily checklist (30 seconds)

1. Morpho plugged into USB  
2. Device light / powered  
3. Windows started normally (RD Service auto-starts)  
4. Open RMS → Scan works when needed  

---

## Quick summary

1. Plug Morpho into USB.  
2. Install **latest** Morpho RD Service (not 1.1.3) → restart PC.  
3. Open RMS on **that same PC** (Chrome / Edge).  
4. Click **Scan** → place finger → success.  

That is all that is required to use fingerprint with RMS.

---

## Who to call

- **RMS support / vendor:** ________________________  
- **Morpho / IDEMIA RD support:** **0806-936-8000**  
- **PC / local Morpho vendor:** ________________________  

When you call, say:

> “UIDAI discontinued RD Service 1.1.3. We upgraded from rdserviceonline.com Downloads. Scanner is plugged in; RMS capture uses ports 11100–11105.”
