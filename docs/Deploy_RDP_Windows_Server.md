# Deploy RMS on Client Windows RDP Server

Use this when the client gives you a Windows RDP machine + local PostgreSQL.

**Do not commit real passwords to git.** Keep them only in `.env` on the server (and a password manager).

---

## Architecture (important)

| Piece | Where it runs |
|-------|----------------|
| **Frontend** (React build) | Served from the RDP server (IIS / Nginx / `serve`) |
| **Backend** (NestJS API) | Runs on the RDP server (Node + PM2) |
| **PostgreSQL** | On the RDP server (or same LAN) |
| **Mantra fingerprint / weighbridge** | On each **mill PC** browser (talks to `127.0.0.1`), **not** only on the RDP host |

Users should open RMS in Chrome/Edge **on the mill PC** (URL of the hosted site).  
Do **not** rely on “only use the app inside RDP” for fingerprint — USB scanners need the local RD Service.

---

## Before you start (security)

1. Credentials shared over chat/email should be **rotated** after deploy (RDP + Postgres).  
2. Never put production passwords in the GitHub repo or this markdown file.  
3. Open only needed firewall ports (e.g. `80`/`443` for web, `3000` only if API is public — prefer reverse proxy).  
4. Change default Postgres password if it is weak or already shared.

---

## What you need from the client

| Item | Example (ask client / check on server) |
|------|----------------------------------------|
| RDP host | IP + port (e.g. `x.x.x.x:9296`) |
| RDP Windows user | Admin user for install |
| Postgres user / password / host | Usually `localhost:5432` |
| Database name | Create e.g. `rms` |
| Public URL / IP for users | e.g. `http://103.194.9.207` or a domain |
| HTTPS? | Strongly recommended if fingerprint + production |

---

## Step 0 — Connect via RDP

1. On your PC: **Remote Desktop Connection** (or AnyDesk if they use that).  
2. Computer: `IP:PORT` if your client supports it, or IP then custom port in advanced settings.  
   - Windows built-in RDP: often `IP` and set port via `mstsc` / `.rdp` file `Server Port: 9296`.  
3. Log in with the Windows admin account.  
4. Confirm you can open **PowerShell** / **CMD** as Administrator.

---

## Step 1 — Install prerequisites on the server

### 1.1 Node.js 20+

1. Download LTS from https://nodejs.org/  
2. Install → open new PowerShell → check:

```powershell
node -v
npm -v
```

### 1.2 PostgreSQL (if not already installed)

1. Install PostgreSQL 15/16 for Windows.  
2. During setup note the `postgres` password.  
3. Open **pgAdmin** or `psql` and create the database:

```sql
CREATE DATABASE rms;
```

4. Test login as `postgres` to `localhost:5432`.

### 1.3 Git (optional but useful)

Install Git for Windows so you can `git clone` / `git pull` updates.

### 1.4 PM2 (keep API running)

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

### 1.5 Static file host (pick one)

- **Option A (simple):** `npm install -g serve`  
- **Option B (better):** IIS with URL Rewrite, or Nginx for Windows  
- **Option C:** Serve frontend from NestJS static folder (advanced)

---

## Step 2 — Copy the RMS project onto the server

Example folder:

```text
C:\apps\RMS\
  backend\
  frontend\
  docs\
```

Ways:

- `git clone <repo-url> C:\apps\RMS`  
- Or ZIP from your PC → copy via RDP clipboard / shared drive → extract  

---

## Step 3 — Configure backend `.env`

```powershell
cd C:\apps\RMS\backend
copy .env.example .env
notepad .env
```

Fill (use **their** real values — do not paste shared chat passwords into git):

```env
DATABASE_URL="postgresql://postgres:YOUR_DB_PASSWORD@127.0.0.1:5432/rms?schema=public"
JWT_SECRET="generate-a-long-random-string-here"
PORT=3000

# Optional
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
# WEIGHBRIDGE_BRIDGE_SECRET=
```

Notes:

- If Postgres is only on localhost, host = `127.0.0.1`.  
- URL-encode special characters in the password (`@` → `%40`, etc.).  
- `JWT_SECRET` must be unique and private.

---

## Step 4 — Install, migrate, seed backend

```powershell
cd C:\apps\RMS\backend
npm install
npx prisma generate
npx prisma db push
```

Optional base admin/roles:

```powershell
npm run seed
```

Build and start with PM2:

```powershell
npm run build
pm2 start dist/main.js --name rms-api
pm2 save
```

Check:

```powershell
pm2 status
curl http://127.0.0.1:3000
```

(If there is no root route, try a known health/login path or open logs: `pm2 logs rms-api`.)

Allow port **3000** in Windows Firewall if the frontend on other PCs will call the API by IP:port. Prefer reverse proxy later.

---

## Step 5 — Configure and build frontend

```powershell
cd C:\apps\RMS\frontend
copy .env.example .env
notepad .env
```

Set the **public** API URL users’ browsers will call:

```env
# If users open http://SERVER_IP and API is on 3000:
VITE_RMS_BACKEND_URL=http://SERVER_IP:3000

# If you put API behind same host/proxy:
# VITE_RMS_BACKEND_URL=https://rms.clientdomain.com/api
```

Build:

```powershell
npm install
npm run build
```

Output is in `frontend\dist\`.

### Serve the UI (simple option)

```powershell
cd C:\apps\RMS\frontend
pm2 serve dist 80 --name rms-web --spa
pm2 save
```

(Or use port `8080` if 80 needs admin / IIS.)

Open from a mill PC browser:

```text
http://SERVER_IP/
```

---

## Step 6 — Firewall / access

On the RDP server (Windows Defender Firewall):

| Port | Purpose |
|------|---------|
| RDP port (e.g. 9296) | Your admin access only — restrict by IP if possible |
| 80 / 443 | Users open the website |
| 3000 | API (if not proxied) |
| 5432 | **Do not** expose Postgres to the public internet |

Confirm mill PCs can reach `http://SERVER_IP` (and API URL).

---

## Step 7 — First login check

1. Open RMS URL from a mill PC.  
2. Log in with seeded / admin user.  
3. Select plant.  
4. Confirm API calls work (Network tab → no CORS / connection errors).  
5. Fingerprint: Mantra RD must be **READY on that mill PC**; test [rdtest.aadhaardevice.com](https://rdtest.aadhaardevice.com/) then RMS Scan.

---

## Day-2 updates (new code)

```powershell
cd C:\apps\RMS
git pull

cd backend
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart rms-api

cd ..\frontend
npm install
# confirm .env VITE_RMS_BACKEND_URL still correct
npm run build
pm2 restart rms-web
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API won’t start | `pm2 logs rms-api` — usually bad `DATABASE_URL` or port in use |
| Frontend loads but login fails | Wrong `VITE_RMS_BACKEND_URL` (rebuild after changing `.env`) |
| CORS errors | Backend already has `enableCors()`; check URL scheme/host mismatch |
| DB auth failed | Password / DB name / Postgres service not running |
| Fingerprint “not found” | RD Service on **mill PC**, not only on RDP server |
| Site only works on server | Firewall blocking 80/3000 for LAN/WAN |

---

## Suggested production hardening (ask client)

1. Put **Nginx/IIS** in front: `https://rms.domain.com` → static + `/api` → `localhost:3000`.  
2. TLS certificate (Let’s Encrypt or client cert).  
3. Strong unique `JWT_SECRET` and Postgres password.  
4. Restrict RDP by VPN or IP allow-list.  
5. Nightly DB backup (`pg_dump`).

---

## Checklist (print for the call)

- [ ] RDP login works  
- [ ] Node 20+ installed  
- [ ] Postgres running; database `rms` created  
- [ ] `backend/.env` set (DB + JWT + PORT)  
- [ ] `prisma generate` + `db push` OK  
- [ ] `pm2` API online  
- [ ] `frontend/.env` points to public API URL  
- [ ] `npm run build` + web served  
- [ ] Login works from mill PC browser  
- [ ] Fingerprint tested on mill PC (RD READY)  
- [ ] Passwords rotated after shared over chat  

---

## Related docs

- [Fingerprint_Mantra_MFS110_Setup_Guide.md](./Fingerprint_Mantra_MFS110_Setup_Guide.md)  
- [Supervisor_Fingerprint_Flow.md](./Supervisor_Fingerprint_Flow.md)  
- Root [README.md](../README.md)
