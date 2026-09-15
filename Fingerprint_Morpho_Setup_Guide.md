# Morpho Fingerprint Scanner — Setup Guide for RMS

**Who this is for:** Mill office / supervisor computers that will use fingerprint in Rice Mill Management System (RMS).

**Device we use:** Morpho fingerprint scanner (with Morpho **RD Service** software)

**You do not need** to be a programmer. Follow the steps in order.

---

## 1. What you need before starting

| Item | Details |
|------|---------|
| Computer | Windows PC (same PC where you open RMS in Chrome / Edge) |
| Scanner | Morpho fingerprint device (USB) |
| USB cable | Cable that came with the Morpho device |
| Software | Morpho **RD Service** installer (from Morpho / your IT vendor / device CD or download) |
| RMS | Our Rice Mill Management System opened in the browser on **this same PC** |

**Important rule**

Fingerprint works only on the **local computer** where the scanner is plugged in.  
It will **not** work from a phone, or from another PC that does not have the scanner + RD Service.

---

## 2. Plug in the Morpho device

1. Turn on the Windows PC.
2. Take the Morpho scanner out of the box.
3. Connect the USB cable:
   - One end → Morpho scanner  
   - Other end → USB port on the PC  
4. Wait 10–20 seconds.
5. Windows may show “Device is ready” or install a small driver automatically.

**Check:** The scanner light usually turns on (or blinks once). If nothing happens, try another USB port on the PC.

---

## 3. Install Morpho RD Service (required software)

RMS does **not** talk to the scanner directly.  
It talks to a small background program called **RD Service**. Morpho provides this program.

### Steps

1. Get the **Morpho RD Service** installer from:
   - Your Morpho vendor / CD, **or**
   - Your RMS support / IT person  
2. Double-click the installer (`.exe` file).
3. Click **Next / Install / Yes** if Windows asks for permission.
4. Finish the installation.
5. **Restart the PC** once (recommended).

After restart, RD Service usually starts **automatically** in the background. You often see a small icon near the Windows clock (bottom-right).

---

## 4. Confirm RD Service is running

Before opening RMS, confirm the service is alive:

1. Look near the Windows clock (bottom-right).  
   - You may see a Morpho / RD Service icon.
2. Or open a browser on the **same PC** and try this address (type carefully):

   `http://127.0.0.1:11100`

   or

   `http://127.0.0.1:11101`

3. If something opens / responds (even a blank or simple page), RD Service is likely running.

**Our RMS checks these ports automatically:** `11100`, `11101`, `11102`.

If none work → RD Service is not installed or not running. Reinstall or ask IT to start **Morpho RD Service**.

---

## 5. Open RMS and test one scan

1. Open **Chrome** or **Edge** (preferred).
2. Go to your RMS website / address (as given by your admin).
3. Log in.
4. Go to a screen that has a fingerprint button, for example:
   - **Users & Roles → Add User** (choose a **Supervisor** role → Scan Finger 1 / Finger 2)  
   - Or Paddy Inward / Gate Pass screens that say **Scan** / fingerprint  
5. Click **Scan Finger 1** (or the Scan / Fingerprint button).
6. When asked, place your finger **firmly and flat** on the Morpho glass.
7. Hold still for 1–2 seconds.
8. You should see a success message like **“Fingerprint captured”** or a green tick.

If you see:  
**“RD Service not found. Please ensure Morpho RD Service is installed and running.”**  
→ Go back to Step 3 and 4.

---

## 6. Where fingerprint is used in RMS (so you know when to scan)

| Place in RMS | What to do |
|--------------|------------|
| **Users & Roles → Add User** (Supervisor) | Register **Finger 1** and **Finger 2** when creating the user |
| **Users & Roles → Transfer User** (Supervisor) | Re-register 2 fingers for the new mill account |
| **Paddy Inward** | Scan at tare / confirm when the screen asks for supervisor fingerprint |
| **Gate Pass** | Scan when closing / confirming with fingerprint (as per your mill process) |
| Other modules (Production, etc.) | Only when a Scan / Fingerprint button is shown |

You only scan when the screen asks for it. You do not need the scanner for normal typing work.

---

## 7. How to place the finger correctly

- Clean, dry finger  
- Press **gently but firmly** on the glass  
- Cover the sensor (don’t use only the tip of the nail)  
- Don’t move until the beep / success message  
- If it fails: wipe the glass, try again with the **same** finger  

For supervisors we register **two different fingers** (example: left thumb + right thumb).

---

## 8. Common problems and easy fixes

| Problem | What to do |
|---------|------------|
| “RD Service not found” | Install / start Morpho RD Service. Restart PC. Plug scanner into USB. |
| Button does nothing | Use the **same PC** where scanner is connected. Don’t use phone browser. |
| Capture failed | Clean sensor, press finger firmly, try again. Close other fingerprint apps. |
| Works on one PC, not another | Scanner + RD Service must be installed on **each** PC that needs fingerprint. |
| Antivirus blocks it | Ask IT to allow Morpho RD Service / localhost ports 11100–11102. |
| Using remote desktop / another office PC | Fingerprint must run on the PC that has the physical Morpho device. |

---

## 9. Daily checklist (30 seconds)

Before supervisors start work:

1. Morpho plugged into USB  
2. Light / device looks powered  
3. Windows started normally (RD Service auto-starts)  
4. Open RMS → try one test scan if needed  

---

## 10. Who to call for help

Provide your support contact:

- **RMS support / your vendor:** ________________________  
- **PC / Morpho vendor (hardware):** ________________________  

When you call, say:

> “We use Morpho fingerprint with RD Service on ports 11100–11102 for RMS. Scanner is plugged in but capture is failing.”

---

## Quick summary

1. Plug Morpho into USB.  
2. Install **Morpho RD Service**.  
3. Restart PC.  
4. Open RMS on **that same PC**.  
5. Click Scan → place finger → success.  

That is all that is required to connect the fingerprint device to our system.
