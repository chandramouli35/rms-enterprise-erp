# Physical Weighbridge — Setup Guide for RMS

**Who this is for:** Mill office / weighbridge computers that will capture live weight into Rice Mill Management System (RMS).

**You do not need** to be a programmer. Follow the steps in order.

---

## 1. What you need before starting

| Item | Details |
|------|---------|
| Computer | Windows PC at the weighbridge (same PC where you open RMS in Chrome / Edge) |
| Indicator | Weighbridge display / indicator unit (e.g. Essae DS2520 or your mill’s model) |
| Cable | Serial / RS-232 cable **or** USB-to-Serial adapter (from weighbridge vendor) |
| Software (test) | **PuTTY** (free) — to confirm weight appears on PC before RMS |
| Software (live) | **RMS Weighbridge COM Bridge** installer (from your RMS support / IT) |
| RMS | Rice Mill Management System opened in the browser on **this same PC** |

---

## 2. Plug in the weighbridge indicator

1. Turn on the Windows PC at the weighbridge.
2. Turn on the weighbridge indicator (power ON).
3. Connect the cable:
   - One end → weighbridge **indicator** serial / USB port  
   - Other end → PC **COM / USB** port  
4. Wait 10–20 seconds.
5. If you used a USB-to-Serial adapter, Windows may install a driver automatically.

**Check:** Device Manager should show a new **COM** port (see Step 3). If nothing appears, try another USB port or reinstall the adapter driver.

---

## 3. Find the COM port number (Windows)

1. Right-click the **Start** button → **Device Manager**.
2. Expand **Ports (COM & LPT)**.
3. Look for a line like:
   - `USB Serial Port (COM3)`  
   - `Communications Port (COM1)`  
   - Or your adapter brand name with `(COMx)`  
4. Note the number carefully — example: **COM3**.

**Tip:** Unplug the cable, refresh Device Manager, plug again. The port that appears / disappears is your weighbridge port.

> Our weighbridge COM port = **COM______**

---

## 4. Test the weight with PuTTY (required)

### 4.1 Install PuTTY

1. Download PuTTY from the official site (or ask IT).  
2. Install and open **PuTTY**.

### 4.2 Configure PuTTY

1. Under **Connection type**, select **Serial**.
2. Set:

| Setting | Value |
|---------|--------|
| Serial line | Your COM port (e.g. `COM3`) |
| Speed (baud) | Try **9600** first, then **2400** if needed |

3. Under Session → Connection → Serial, set:

| Parameter | Value |
|-----------|--------|
| Data bits | **8** |
| Stop bits | **1** |
| Parity | **None** |
| Flow control | **None** |

4. Click **Open**.

### 4.3 Success

- A black terminal window opens.
- When the indicator shows a weight, you should see **numbers / weight text** in PuTTY matching the indicator.
- If yes → hardware is OK. Proceed to Step 5.

**Stop here until PuTTY shows weight.** Then continue.

---

## 5. Install the RMS Weighbridge COM Bridge

1. Get the **RMS Weighbridge COM Bridge** installer from your RMS support / IT person.
2. Double-click the installer (`.exe` file).
3. Click **Next / Install / Yes** if Windows asks for permission.
4. Enter the same values that worked in PuTTY:
   - **COM port** (e.g. COM3)  
   - **Baud rate** (9600 or 2400)  
   - Data bits **8**, Parity **None**, Stop bits **1**  
5. Finish installation.
6. **Restart the PC** once (recommended).

After restart, the COM Bridge usually starts **automatically** (icon near the Windows clock).

**Important:** Keep PuTTY **closed** when using the Bridge. Only one program should use the COM port.

---

## 6. Configure settings inside RMS

1. Open **Chrome** or **Edge** on the **same weighbridge PC**.
2. Go to your RMS website and log in.
3. Open sidebar → **Weighbridge** → **Settings**.
4. Set values to match PuTTY:

| Field in RMS | Typical value |
|--------------|----------------|
| Indicator Model | Your model (e.g. Essae – DS2520) or closest match |
| Connection Type | **Serial Port (COM)** |
| Port | Your COM port (e.g. **COM3**) |
| Baud Rate | **9600** or **2400** (whichever worked in PuTTY) |
| Data Bits | **8** |
| Stop Bits | **1** |
| Parity | **None** |
| Weight Unit | **Kilogram (kg)** |

5. Click **Save Settings**.

---

## 7. Test live capture in RMS

1. Stay on the weighbridge PC (cable + Bridge running).
2. Go to **Weighbridge → Capture**.
3. Place a vehicle on the platform (or use a known test weight).
4. Confirm the live weight in RMS matches the **indicator display**.
5. Complete a test Gross / Tare punch.

Setup is complete when live weight in RMS matches the indicator.
