# RMS on Client RDP — Updates & Daily Commands

Your first install is **already done** (Node, Git, PM2, serve, backend, frontend).  
Use this file for **future code updates** and everyday server commands.

---

## Server layout (already set)

| Item | Location / value |
|------|------------------|
| Project folder | `C:\apps\RMS` |
| Backend | `C:\apps\RMS\backend` |
| Frontend | `C:\apps\RMS\frontend` |
| Backend env | `C:\apps\RMS\backend\.env` |
| Frontend env | `C:\apps\RMS\frontend\.env` |
| API process (PM2) | `rms-api` → port **3000** |
| Website process (PM2) | `rms-web` → port **8080** |
| Local test URL | `http://127.0.0.1:8080` |
| Public URL (after ports open) | `http://103.194.9.207:8080` |
| GitHub repo | `https://github.com/chandramouli35/rms-enterprise-erp.git` |

**Already installed on RDP:** Node.js, Git, `pm2`, `serve` (and optional `pm2-windows-startup`).

Do **not** reinstall these for every update.

---

## How updates work

```text
Your laptop  →  git push to GitHub
RDP server   →  git pull  →  rebuild  →  pm2 restart
```

Repo is public → `git pull` on RDP needs **no GitHub login**.

Keep these files on the server (never delete when updating):

- `backend\.env`
- `frontend\.env`

---

## 1. Push new code from your laptop

On **your PC** (not RDP):

```powershell
cd C:\Users\tarig\Desktop\RMS
git add .
git commit -m "Your update message"
git push origin main
```

---

## 2. Pull + apply on RDP (main update steps)

Connect Remote Desktop → open **PowerShell**.

### Step A — Go to project

```powershell
cd C:\apps\RMS
```

### Step B — Pull latest code

```powershell
git status
git pull origin main
```

### Step C — Update backend

```powershell
cd C:\apps\RMS\backend
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart rms-api
```

### Step D — Update frontend

```powershell
cd C:\apps\RMS\frontend
npm install
npm run build
pm2 restart rms-web
```

### Step E — Verify

```powershell
pm2 status
pm2 save
```

Open on RDP browser:

```text
http://127.0.0.1:8080
```

Hard refresh: `Ctrl + Shift + R`

---

## 3. Full copy-paste block (every update)

```powershell
cd C:\apps\RMS
git pull origin main

cd C:\apps\RMS\backend
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart rms-api

cd C:\apps\RMS\frontend
npm install
npm run build
pm2 restart rms-web

pm2 status
pm2 save
```

---

## 4. If only `.env` changed

### Backend `.env` only

```powershell
notepad C:\apps\RMS\backend\.env
pm2 restart rms-api
```

No rebuild needed — **restart is required**.

### Frontend `.env` only (example API URL)

```powershell
notepad C:\apps\RMS\frontend\.env
cd C:\apps\RMS\frontend
npm run build
pm2 restart rms-web
```

Frontend env needs **rebuild**, not restart alone.

Example frontend env:

```env
VITE_RMS_BACKEND_URL=http://103.194.9.207:3000
```

---

## 5. PM2 commands (daily)

### Status

```powershell
pm2 status
pm2 list
```

### Restart

```powershell
pm2 restart rms-api
pm2 restart rms-web
pm2 restart all
```

### Stop / start

```powershell
pm2 stop rms-api
pm2 stop rms-web
pm2 start rms-api
pm2 start rms-web
```

### Logs

```powershell
pm2 logs
pm2 logs rms-api
pm2 logs rms-web
pm2 logs rms-api --lines 100
```

Exit logs: `Ctrl + C`

### Clear logs

```powershell
pm2 flush
```

### Details / monitor

```powershell
pm2 show rms-api
pm2 show rms-web
pm2 monit
```

### Save process list (after reboot setup)

```powershell
pm2 save
```

### Recreate website process (if needed)

```powershell
pm2 delete rms-web
pm2 serve C:\apps\RMS\frontend\dist 8080 --name rms-web --spa
pm2 save
```

### Recreate API process (if needed)

```powershell
pm2 delete rms-api
cd C:\apps\RMS\backend
pm2 start dist/main.js --name rms-api
pm2 save
```

---

## 6. Useful folder / check commands

```powershell
cd C:\apps\RMS
dir
dir backend
dir frontend

notepad C:\apps\RMS\backend\.env
notepad C:\apps\RMS\frontend\.env

netstat -ano | findstr ":3000"
netstat -ano | findstr ":8080"

curl http://127.0.0.1:3000
curl http://127.0.0.1:8080
```

---

## 7. What you already installed (reference only)

You already ran these on RDP once. **Do not run again** unless a new server:

```powershell
npm install -g pm2
npm install -g serve
```

Optional auto-start after Windows reboot (Admin PowerShell — already done if you ran it):

```powershell
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

Check tools:

```powershell
node -v
npm -v
git --version
pm2 -v
serve --version
```

---

## 8. Weighbridge note

Backend + frontend updates are on **RDP**.  
Weighbridge COM / Web Serial runs on the **mill weighbridge PC**, not via PM2 on RDP (unless the scale is plugged into that server).

---

## 9. Do I need full reinstall?

| Task | First time | Future updates |
|------|------------|----------------|
| Install Node / Git / PM2 / serve | Done | No |
| `git clone` | Done | No — use `git pull` |
| Create `.env` | Done | Keep existing |
| `npm install` + build + `pm2 restart` | Done | **Yes, each update** |
| Ask client to open ports 8080 + 3000 | Pending / once | No |

---

## 10. Common issues

| Problem | Fix |
|---------|-----|
| Site looks old after pull | Rebuild FE + `pm2 restart rms-web` + `Ctrl+Shift+R` |
| `git pull` already up to date | Confirm you pushed from laptop to `main` |
| Login fails | Check `VITE_RMS_BACKEND_URL`, rebuild FE |
| API down | `pm2 logs rms-api` |
| Public URL not opening | Client must forward ports 8080 + 3000; local `127.0.0.1:8080` can still work |

---

## One-line reminder

**Push on laptop → on RDP `git pull` → backend build + restart → frontend build + restart → `pm2 status`.**
