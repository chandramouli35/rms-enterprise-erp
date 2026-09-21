# Supervisor Fingerprint Flow — Start to End

This document describes the full supervisor biometric flow in RMS with Mantra MFS110 L1.

**Device:** Mantra MFS110 L1  
**Software:** Mantra MFS110 L1 RD Service (Windows)  
**Rule:** Fingerprint only works on the PC where the scanner + RD Service are installed.

---

## Overview

```
Admin enrolls supervisor (2 fingers)
        ↓
Supervisor logs in (password)
        ↓
Opens form → Scan
        ↓
Live finger vs THIS login’s enrolled fingers
        ↓
Match → continue / save
No match → "Fingerprint not matched"
```

**Important:** Form Scan always checks the **currently logged-in** supervisor — not someone else’s enrolled fingerprints.

---

## Step 1 — Admin creates the supervisor

**Where:** Users & Roles → Add User  

1. Enter name / User ID / password / mill.  
2. Select role = **Supervisor**.  
3. Click **Scan Finger 1** → place finger on MFS110 → wait for success.  
4. Click **Scan Finger 2** → use a **different** finger → wait for success.  
5. Save user.

### What RMS stores

| Field | Purpose |
|-------|---------|
| `fingerprint1` / `fingerprint2` | PidData XML from RD capture (audit / sign-off) |
| `fingerprint1Template` / `fingerprint2Template` | Matchable FMR/ISO when the RD response allows extraction |

Without Finger 1 + Finger 2, supervisor create is **blocked**.

---

## Step 2 — Supervisor logs into RMS

1. Open RMS in Chrome or Edge on the scanner PC.  
2. Log in with username + password.  

**Note:** Login itself does **not** require a fingerprint — only password. Fingerprint is used later on form Scan.

---

## Step 3 — Open a form that needs Scan

Examples:

- Paddy Inward (tare / confirm)
- Truck Management
- Gate Pass (confirm / close)
- Production
- Yield / Consignment
- Boli / Inward lists
- Loader–Unloader report (supervisor punch)

---

## Step 4 — Supervisor clicks Scan

On that PC (MFS110 plugged in, Mantra RD Service **READY**):

1. Browser talks to Mantra RD Service on `127.0.0.1` (ports 11100–11120).  
2. Supervisor places finger firmly on the scanner.  
3. RMS captures live PidData.  
4. Frontend calls **`POST /auth/verify-fingerprint`** with the live scan.  
5. Backend loads **this logged-in user’s** enrolled fingerprints.  
6. Compares live scan against enrolled Finger 1 / Finger 2.

### Results

| Result | What happens |
|--------|----------------|
| Match OK (same enrolled finger) | Scan accepted; form can continue / submit |
| Wrong finger | Error: **Fingerprint not matched** — no bypass, no dummy accept |
| Match templates missing | Re-enroll Finger 1 and Finger 2 (must be real ISO templates) |
| No fingerprints on this user | Error: **No fingerprint enrolled for your login…** |
| Device not READY / RD Service down | Device / RD error — fix scanner first |

**Admins** are not bypassed on Scan. A wrong finger or a failed match always shows an error.

### Important fix (wrong finger was accepting)

Older builds used a soft “presence” check when Mantra encrypted PidData (any valid scan passed). That is **removed**.  

Verify is now **strict 1:1**. Supervisors enrolled before this fix must **re-enroll Finger 1 + Finger 2** so match templates are stored.

---

## Step 5 — Form submit

1. Scan must already have passed verify.  
2. Form saves with `biometricData` as the supervisor sign-off.  
3. Record is tied to that capture for audit.

---

## Step 6 — Transfer to another mill (if needed)

**Where:** Users & Roles → Transfer User  

1. Choose destination mill.  
2. Enter new User ID + password for the new mill account.  
3. **Scan Finger 1 + Finger 2 again** for the new account (must get match templates).  
4. Confirm transfer.

- New mill account is created with the new fingerprints.  
- Old account is archived; historical entries and prior fingerprints are retained.

---

## Enrollment vs form Scan

| Action | Who | Match? |
|--------|-----|--------|
| Users & Roles — Add / Transfer supervisor | Admin | Enroll only — must capture **matchable** templates |
| Staff — Unloader registration | Admin | Enroll only |
| Form Scan (inward, truck, gate pass, etc.) | Logged-in supervisor | **Yes — strict match** vs logged-in user |

---

## Quick client checklist

1. Mantra RD Service tray = **READY** (not NOTREADY).  
2. Prove Capture on [https://rdtest.aadhaardevice.com/](https://rdtest.aadhaardevice.com/) first.  
3. **Re-enroll** supervisor Finger 1 + Finger 2 after this update.  
4. Log in as that supervisor.  
5. Form → Scan with an **enrolled** finger → should pass.  
6. Scan with a **different** finger → must show **Fingerprint not matched**.

---

## Related docs

- [Fingerprint_Mantra_MFS110_Setup_Guide.md](./Fingerprint_Mantra_MFS110_Setup_Guide.md) — install, READY, HTTPS, troubleshooting  
- API: `POST /auth/verify-fingerprint`  
- Frontend: `biometricService.captureAndVerifyLoggedInUser()`
