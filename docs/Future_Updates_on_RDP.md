# Future Updates on RDP Server (Pull Latest Code)

Use this **after** the first deploy is done.  
You do **not** need to clone again or redo the full install every time.

Because the repo is **public**, `git pull` on the RDP server needs **no GitHub login**.

---

## Quick idea

```text
Your PC  →  git push to GitHub
RDP PC   →  git pull + rebuild + pm2 restart
```

Keep these files on the server (do **not** overwrite them with empty ones):

- `C:\apps\RMS\backend\.env`
- `C:\apps\RMS\frontend\.env`
- `C:\apps\RMS\weighbridge-bridge\config.json` (if used)

---

## Project location on RDP

```text
C:\apps\RMS
```

Open PowerShell on RDP, then:

```powershell
cd C:\apps\RMS
```

---

## A. Push from your laptop (your PC)

On **your** development PC (not RDP):

```powershell
cd C:\Users\tarig\Desktop\RMS
git status
git add .
git commit -m "Describe your change"
git push origin main
```

(Use your real branch name if it is not `main`.)

---

## B. Get latest code on RDP (every update)

### Step 1 — Go to project folder

```powershell
cd C:\apps\RMS
```

### Step 2 — Check current status

```powershell
git status
git remote -v
```

Remote should show something like:

```text
origin  https://github.com/chandramouli35/rms-enterprise-erp.git
```

### Step 3 — Pull latest code

```powershell
git pull origin main
```

If your branch is different:

```powershell
git branch
git pull origin YOUR_BRANCH_NAME
```

#### If `git pull` complains about local changes

Only if you edited files on the server by mistake:

```powershell
git stash
git pull origin main
```

(Or ask before discarding server changes.)

#### Never do this unless you mean it

```powershell
# DANGER: deletes local uncommitted changes on server
git reset --hard origin/main
git pull origin main
```

---

## C. Update Backend (API)

```powershell
cd C:\apps\RMS\backend
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart rms-api
```

### What each command does

| Command | Purpose |
|---------|---------|
| `npm install` | Install new packages if `package.json` changed |
| `npx prisma generate` | Refresh Prisma client |
| `npx prisma db push` | Apply DB schema changes |
| `npm run build` | Compile NestJS to `dist` |
| `pm2 restart rms-api` | Run the new build |

### If only `.env` changed (no code push)

```powershell
cd C:\apps\RMS\backend
# edit .env in Notepad
pm2 restart rms-api
```

No rebuild needed for `.env` only — but **restart is required**.

---

## D. Update Frontend (website)

```powershell
cd C:\apps\RMS\frontend
npm install
npm run build
pm2 restart rms-web
```

### Important

If you changed `frontend\.env` (example `VITE_RMS_BACKEND_URL`):

1. Edit `.env`
2. **Must** run `npm run build` again
3. Then `pm2 restart rms-web`

Restart alone is **not** enough for frontend env changes.

---

## E. Weighbridge bridge (only if you use that folder)

Usually **not** on RDP. On the **weighbridge PC**:

```powershell
cd C:\apps\RMS\weighbridge-bridge
git pull origin main
npm install
pm2 restart weighbridge-bridge
```

If you don’t use PM2 there:

```powershell
# stop old window (Ctrl+C), then:
npm start
```

Normal mills can skip this and keep using **Connect Indicator** (Web Serial) in the browser.

---

## F. Full update checklist (copy/paste)

Run on RDP after you pushed to GitHub:

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

Then test:

```text
http://127.0.0.1:8080
```

Hard refresh browser: `Ctrl + Shift + R`

When public ports are open:

```text
http://103.194.9.207:8080
```

---

## G. PM2 commands (everyday)

### Status / list

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

### Logs (errors / live output)

```powershell
pm2 logs
pm2 logs rms-api
pm2 logs rms-web
pm2 logs rms-api --lines 100
```

Stop logs view: `Ctrl + C`

### Clear old logs

```powershell
pm2 flush
```

### Save process list (survive reboot, if startup was installed)

```powershell
pm2 save
```

### Delete a process (only if you need to recreate it)

```powershell
pm2 delete rms-web
pm2 serve C:\apps\RMS\frontend\dist 8080 --name rms-web --spa
pm2 save
```

### Show details

```powershell
pm2 show rms-api
pm2 show rms-web
```

### Monitor (CPU / memory)

```powershell
pm2 monit
```

---

## H. Useful folder / file commands

```powershell
# Go to project
cd C:\apps\RMS

# List files
dir
dir backend
dir frontend

# Edit env
notepad C:\apps\RMS\backend\.env
notepad C:\apps\RMS\frontend\.env

# Check ports listening
netstat -ano | findstr ":3000"
netstat -ano | findstr ":8080"

# Test API / web on server
curl http://127.0.0.1:3000
curl http://127.0.0.1:8080
```

---

## I. Do I need to redo first-time install?

| Task | First deploy | Every update |
|------|--------------|--------------|
| Install Node / Git / PM2 | Yes | No |
| `git clone` | Yes (once) | No — use `git pull` |
| Create `.env` | Yes (once) | No — keep existing |
| Open firewall / ask port forward | Yes | No (unless new ports) |
| `npm install` | Yes | Yes (if deps changed; safe to always run) |
| `prisma db push` | Yes | Yes (if schema changed; safe to always run) |
| `npm run build` | Yes | Yes |
| `pm2 restart` | start once | restart after build |

---

## J. Common problems

| Problem | Fix |
|---------|-----|
| `git pull` says “already up to date” but site looks old | Hard refresh `Ctrl+Shift+R`; confirm you pushed from laptop; confirm RDP pulled same branch |
| Login fails after FE update | Check `VITE_RMS_BACKEND_URL`, rebuild frontend, restart `rms-web` |
| API crash after pull | `pm2 logs rms-api` — often missing env or Prisma |
| `npm install` errors | Check internet on RDP; retry |
| Port in use | `pm2 status` then restart/delete correct process |
| Public URL not opening | Client must forward 8080 + 3000 (app can still work on `127.0.0.1:8080`) |

---

## K. One-line summary

1. Push from your PC → GitHub  
2. On RDP: `git pull`  
3. Backend: install → prisma → build → `pm2 restart rms-api`  
4. Frontend: install → build → `pm2 restart rms-web`  
5. Check `pm2 status` + open `http://127.0.0.1:8080`

No full re-clone needed.
