# Complete RMS Hosting Guide (Windows RDP Server)

**One full guide** — from first RDP login to users opening the website, fingerprint notes, updates, and troubleshooting.

---

## Table of contents

1. [What you will build](#1-what-you-will-build)
2. [What you need from the client](#2-what-you-need-from-the-client)
3. [Security rules](#3-security-rules)
4. [Connect with Remote Desktop (RDP)](#4-connect-with-remote-desktop-rdp)
5. [Install software on the server](#5-install-software-on-the-server)
6. [Create the database](#6-create-the-database)
7. [Copy RMS project to the server](#7-copy-rms-project-to-the-server)
8. [Configure and start the backend (API)](#8-configure-and-start-the-backend-api)
9. [Configure and start the frontend (website)](#9-configure-and-start-the-frontend-website)
10. [Windows Firewall](#10-windows-firewall)
11. [First login test](#11-first-login-test)
12. [Make API + website start after reboot](#12-make-api--website-start-after-reboot)
13. [Fingerprint & weighbridge (mill PCs)](#13-fingerprint--weighbridge-mill-pcs)
14. [How to update RMS later](#14-how-to-update-rms-later)
15. [Useful everyday commands](#15-useful-everyday-commands)
16. [Full troubleshooting](#16-full-troubleshooting)
17. [Final checklist](#17-final-checklist)

---

## 1. What you will build

RMS has 3 parts:

| Part | What it is | Where it runs | Port (this guide) |
|------|------------|---------------|-------------------|
| **PostgreSQL** | Database (all data) | RDP server | `5432` (local only) |
| **Backend** | NestJS API | RDP server | `3000` |
| **Frontend** | React website | RDP server | `8080` |

**Users open:**

```text
http://SERVER_PUBLIC_IP:8080
```

Example (replace with client IP):

```text
http://103.194.9.207:8080
```

### Important architecture note

```text
Mill PC browser  --->  Website on RDP server (:8080)
Mill PC browser  --->  API on RDP server (:3000)
Mill PC browser  --->  Mantra RD on SAME mill PC (127.0.0.1)   ← fingerprint
```

- Hosting = RDP server  
- Fingerprint scanner software = each mill PC (not only the server)

Do **not** expect fingerprint to work only inside RDP unless the USB scanner is attached to that server and redirected (usually worse). Best: users open the hosted URL in Chrome on the mill PC.

---

## 2. What you need from the client

Collect this before starting:

| Item | Example | Notes |
|------|---------|--------|
| RDP IP | `103.194.9.207` | Public IP of Windows server |
| RDP port | `9296` | Not always 3389 |
| RDP username | Windows admin user | Needed to install software |
| RDP password | (private) | Do not put in git |
| Postgres username | usually `postgres` | |
| Postgres password | (private) | |
| Postgres host | usually `127.0.0.1` | Same machine |
| Postgres port | usually `5432` | |
| Who will open the site | mill PCs on internet/LAN | Need firewall allow |
| Domain / HTTPS later? | optional | Better for production |

**Do not write real passwords into GitHub or markdown files in the repo.**  
Keep them in the server `.env` only + a password manager.

---

## 3. Security rules

1. Passwords shared on WhatsApp/chat should be **changed after deploy**.  
2. Never commit `.env` files.  
3. Do **not** open Postgres port `5432` to the public internet.  
4. Prefer later: domain + HTTPS (IIS/Nginx). This guide uses HTTP first so beginners can finish.  
5. Restrict RDP access if possible (VPN / IP allow-list).

---

## 4. Connect with Remote Desktop (RDP)

### 4.1 From your Windows PC

1. Press `Win` key → type **Remote Desktop Connection** → Open.  
2. Click **Show Options**.  
3. **Computer:** try one of these:
   - `103.194.9.207:9296`  
   - or only `103.194.9.207` if port is configured another way  
4. **User name:** client Windows username (example `Nautiyal-admin`).  
5. **Connect** → enter password.  
6. If certificate warning appears → **Yes** / Connect anyway (common on self-hosted servers).

### 4.2 If port 9296 does not work in the Computer box

Create a `.rdp` file:

1. Connect once with IP only (if possible), or ask client for their `.rdp` file.  
2. Or Notepad → save as `client.rdp`:

```text
full address:s:103.194.9.207:9296
username:s:Nautiyal-admin
```

3. Double-click `client.rdp`.

✅ **Success:** you see the remote Windows desktop.

---

## 5. Install software on the server

Open browser **on the RDP desktop**.

### 5.1 Node.js 20 LTS (required)

1. Go to https://nodejs.org/  
2. Download **LTS** → run installer → Next → Next → Finish.  
3. Close any open PowerShell/CMD.  
4. Open **new** PowerShell as Administrator and run:

```powershell
node -v
npm -v
```

✅ Must show versions (example `v20.18.0` and `10.x.x`).

### 5.2 Git (recommended)

1. https://git-scm.com/download/win  
2. Install with defaults.  
3. Check:

```powershell
git --version
```

### 5.3 PostgreSQL (if not already installed)

1. Download PostgreSQL Windows installer (15 or 16):  
   https://www.postgresql.org/download/windows/  
2. During install:
   - Set/remember `postgres` password  
   - Keep port `5432`  
   - Install **Command Line Tools** + **pgAdmin**  
3. After install, confirm Windows service **postgresql-x64-…** is **Running** (services.msc).

### 5.4 Global helpers (PM2 + serve)

```powershell
npm install -g pm2
npm install -g serve
```

Optional (auto-start PM2 after Windows reboot — run once as Admin):

```powershell
npm install -g pm2-windows-startup
pm2-startup install
```

---

## 6. Create the database

### 6.1 Using pgAdmin (easy)

1. Open **pgAdmin 4**.  
2. Connect to local server (password = postgres password).  
3. Right-click **Databases** → **Create** → **Database**.  
4. Name: `rms` → Save.

### 6.2 Using psql (optional)

```powershell
psql -U postgres
```

Then:

```sql
CREATE DATABASE rms;
\l
\q
```

If `CREATE DATABASE` says already exists → OK.

✅ **Success:** database named `rms` exists.

---

## 7. Copy RMS project to the server

Target folder:

```text
C:\apps\RMS\
  backend\
  frontend\
  docs\
```

### Option A — ZIP from your laptop (beginner friendly)

1. On your PC, zip the full RMS project folder.  
2. On RDP: create `C:\apps`.  
3. Copy ZIP into `C:\apps` (RDP copy-paste, shared drive, or cloud).  
4. Extract to `C:\apps\RMS`.

### Option B — Git clone

```powershell
mkdir C:\apps -Force
cd C:\apps
git clone YOUR_REPO_URL RMS
cd RMS
```

✅ **Success:**

```powershell
dir C:\apps\RMS\backend
dir C:\apps\RMS\frontend
```

Both folders must exist.

---

## 8. Configure and start the backend (API)

### 8.1 Create `.env`

```powershell
cd C:\apps\RMS\backend
copy .env.example .env
notepad .env
```

Paste/edit like this (use real DB password; do not commit this file):

```env
DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@127.0.0.1:5432/rms?schema=public"
JWT_SECRET="replace-with-long-random-secret-at-least-32-chars"
PORT=3000
```

#### Password special characters in DATABASE_URL

If password contains `@ # % / : ? &` etc., URL-encode them:

| Char | Encode |
|------|--------|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `/` | `%2F` |
| `:` | `%3A` |
| `?` | `%3F` |
| `&` | `%26` |
| ` ` (space) | `%20` |

Example: password `a@b` → `postgresql://postgres:a%40b@127.0.0.1:5432/rms?schema=public`

Optional Cloudinary (only if used for truck photos):

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Save Notepad → close.

### 8.2 Install dependencies + create tables

```powershell
cd C:\apps\RMS\backend
npm install
npx prisma generate
npx prisma db push
```

Wait until finished with **no red error**.

### 8.3 Seed default admin (recommended first time)

```powershell
npm run seed
```

Default Super Admin after seed:

| Field | Value |
|-------|--------|
| Username | `superadmin` |
| Email | `admin@ricefield.com` |
| Password | `AdminPassword@123` |

**Change this password after first login.**

### 8.4 Build API

```powershell
npm run build
```

### 8.5 Start API with PM2

```powershell
cd C:\apps\RMS\backend
pm2 start dist/main.js --name rms-api
pm2 save
pm2 status
```

✅ `rms-api` must be **online**.

Check logs if needed:

```powershell
pm2 logs rms-api --lines 50
```

You should see something like: `Backend Running on Port : 3000`

Local test on server browser:

```text
http://127.0.0.1:3000
```

Nest may show `Cannot GET /` — that is normal if there is no home route. API is still running.

---

## 9. Configure and start the frontend (website)

### 9.1 Create frontend `.env`

```powershell
cd C:\apps\RMS\frontend
copy .env.example .env
notepad .env
```

Set the **public** API URL that mill browsers will call:

```env
VITE_RMS_BACKEND_URL=http://103.194.9.207:3000
```

Rules:

- No trailing slash  
- Must be reachable from mill PCs (same IP users will use)  
- If you change this later → you **must rebuild** frontend (`npm run build` again)

Save → close.

### 9.2 Install + build

```powershell
cd C:\apps\RMS\frontend
npm install
npm run build
```

Build output folder: `C:\apps\RMS\frontend\dist`

### 9.3 Serve website with PM2

```powershell
pm2 serve C:\apps\RMS\frontend\dist 8080 --name rms-web --spa
pm2 save
pm2 status
```

✅ `rms-web` must be **online**.

Test on server browser:

```text
http://127.0.0.1:8080
```

You should see RMS login page.

---

## 10. Windows Firewall

So other PCs can open the site:

1. On RDP: search **Windows Defender Firewall with Advanced Security**  
2. **Inbound Rules** → **New Rule…**  
3. **Port** → Next  
4. **TCP** → Specific local ports: `3000,8080` → Next  
5. **Allow the connection** → Next  
6. Tick Domain + Private + Public (or as client IT requires) → Next  
7. Name: `RMS Web and API` → Finish  

Also ask client IT:

- Cloud / router firewall must allow inbound **8080** (web) and **3000** (API) to this server  
- Or they put a reverse proxy on 80/443 later

✅ Test from **another PC** (not only RDP):

```text
http://103.194.9.207:8080
```

---

## 11. First login test

1. Open `http://SERVER_IP:8080` from a mill PC.  
2. Login:
   - User: `superadmin`  
   - Password: `AdminPassword@123` (if you ran seed)  
3. Select a plant if asked.  
4. Open Dashboard / any module.  
5. Press `F12` → **Network** tab:
   - Login request should go to `http://SERVER_IP:3000/...`  
   - Status should be `200` (not failed / CORS / blocked)

### If login page opens but login fails

1. Confirm backend online: `pm2 status`  
2. Confirm `VITE_RMS_BACKEND_URL` is correct  
3. Rebuild frontend after any `.env` change:

```powershell
cd C:\apps\RMS\frontend
npm run build
pm2 restart rms-web
```

4. Hard refresh browser: `Ctrl+Shift+R`

---

## 12. Make API + website start after reboot

If you already ran `pm2-startup install`:

```powershell
pm2 save
```

After Windows restart, check:

```powershell
pm2 status
```

If apps are missing:

```powershell
cd C:\apps\RMS\backend
pm2 start dist/main.js --name rms-api

pm2 serve C:\apps\RMS\frontend\dist 8080 --name rms-web --spa
pm2 save
```

Also ensure PostgreSQL Windows service is set to **Automatic**.

---

## 13. Fingerprint & weighbridge (mill PCs)

### Fingerprint (Mantra MFS110)

On **each PC that will click Scan**:

1. Install **Mantra MFS110 L1 RD Service** (not old MFS100 only).  
2. Plug scanner → wait tray status **READY**.  
3. Test: https://rdtest.aadhaardevice.com/  
   - Discover → Device Info → Capture must work  
4. Open hosted RMS URL in Chrome/Edge on that same PC → Scan.  
5. If site is HTTPS later: trust `https://127.0.0.1:1110x` certificate once.

Docs:

- `docs/Fingerprint_Mantra_MFS110_Setup_Guide.md`  
- `docs/Supervisor_Fingerprint_Flow.md`

### Weighbridge

COM / Web Serial runs on the mill PC browser, not inside the API server. Configure on the PC connected to the weighbridge cable.

---

## 14. How to update RMS later

When you have new code:

### If using ZIP

1. Stop apps (optional but safer):

```powershell
pm2 stop rms-api
pm2 stop rms-web
```

2. Backup folder: copy `C:\apps\RMS` to `C:\apps\RMS_backup_DATE`  
3. Replace code (keep old `backend\.env` and `frontend\.env` — do not overwrite with empty ones)  
4. Continue with commands below

### If using Git

```powershell
cd C:\apps\RMS
git pull
```

### Backend update

```powershell
cd C:\apps\RMS\backend
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart rms-api
```

### Frontend update

```powershell
cd C:\apps\RMS\frontend
npm install
npm run build
pm2 restart rms-web
```

### Verify

```powershell
pm2 status
pm2 logs rms-api --lines 30
```

Open site → hard refresh (`Ctrl+Shift+R`).

---

## 15. Useful everyday commands

```powershell
# Status
pm2 status

# Restart
pm2 restart rms-api
pm2 restart rms-web

# Stop
pm2 stop rms-api
pm2 stop rms-web

# Logs (API errors)
pm2 logs rms-api

# Logs (web)
pm2 logs rms-web

# Clear huge logs
pm2 flush
```

---

## 16. Full troubleshooting

| Problem | Cause | Fix |
|---------|--------|-----|
| Cannot RDP | Wrong IP/port/password, firewall | Confirm port 9296, VPN, client IT |
| `node` not recognized | Node not installed / old terminal | Reinstall Node LTS, open **new** PowerShell |
| `npm install` fails | No internet / proxy | Fix network; retry; check company proxy |
| Prisma / DB auth failed | Wrong `DATABASE_URL` | Fix password, host, db name `rms`; encode special chars |
| `db push` fails | Postgres not running | Start PostgreSQL service |
| `pm2` not found | Not installed globally | `npm install -g pm2` |
| `rms-api` errored | Crash on boot | `pm2 logs rms-api` — usually `.env` / DB |
| Port 3000 in use | Another process | `netstat -ano | findstr :3000` then stop PID / change PORT |
| Site not opening remotely | Firewall | Allow 3000+8080; check router/cloud firewall |
| Blank page on :8080 | Build missing | `npm run build` then restart `rms-web` |
| Login fails, page loads | Wrong API URL | Fix `VITE_RMS_BACKEND_URL`, rebuild frontend |
| CORS / blocked in Network | Mixed URL / HTTPS-HTTP | Keep both HTTP for now, or put both behind HTTPS later |
| Fingerprint not found | RD not on mill PC | Install Mantra RD on mill PC; READY; test rdtest page |
| Works on server only | Firewall / wrong public IP | Open ports; confirm public IP with client |

### Encode check for DATABASE_URL

Quick test from backend folder:

```powershell
cd C:\apps\RMS\backend
npx prisma db pull
```

If this fails, database URL/password is still wrong.

---

## 17. Final checklist

### Server

- [ ] RDP login works  
- [ ] Node.js LTS installed (`node -v`)  
- [ ] PostgreSQL running  
- [ ] Database `rms` created  
- [ ] Code at `C:\apps\RMS`  
- [ ] `backend\.env` filled (`DATABASE_URL`, `JWT_SECRET`, `PORT`)  
- [ ] `npm install` + `prisma generate` + `db push` OK  
- [ ] `npm run seed` done (or admin user created another way)  
- [ ] `npm run build` + `pm2` `rms-api` online  
- [ ] `frontend\.env` has public `VITE_RMS_BACKEND_URL`  
- [ ] Frontend built + `pm2` `rms-web` online on 8080  
- [ ] Firewall allows TCP 3000 and 8080  
- [ ] Login works from mill PC browser  
- [ ] Default admin password changed  
- [ ] Shared chat passwords rotated  

### Mill PC

- [ ] Can open `http://SERVER_IP:8080`  
- [ ] Login works  
- [ ] Mantra RD READY (if fingerprint needed)  
- [ ] rdtest Capture OK  
- [ ] RMS Scan OK  

---

## Quick reference card

| Item | Value in this setup |
|------|---------------------|
| Project path | `C:\apps\RMS` |
| API | `http://SERVER_IP:3000` |
| Website | `http://SERVER_IP:8080` |
| DB name | `rms` |
| DB user | `postgres` |
| Process manager | PM2 (`rms-api`, `rms-web`) |
| First admin (after seed) | `superadmin` / `AdminPassword@123` |

---

## Related docs

| File | Topic |
|------|--------|
| `docs/Fingerprint_Mantra_MFS110_Setup_Guide.md` | Scanner install & READY |
| `docs/Supervisor_Fingerprint_Flow.md` | Enroll → Scan → match flow |
| `docs/Deploy_RDP_Windows_Server.md` | Shorter deploy notes |
| `README.md` | Local development |

---

## Need help while on the call?

Tell me:

1. Which section number you are on (example: **8.2**)  
2. The **exact error text** (copy/paste red lines)  
3. Screenshot if possible  

I will reply with the next single action only.
