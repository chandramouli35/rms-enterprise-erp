# Rice Mill Management System (RMS)

## RDP Server Setup — How It Was Done

This document records how RMS was set up on the client RDP server for handover.

---

## Access

- Connected to the Windows RDP server using **Windows App**
- Logged in with the server **IP**, **username**, and **password**

---

## What was installed / prepared

- **Node.js** was installed on the RDP machine
- Application folder created at:

```text
C:\apps\RMS
```

- Git repository was made available (temporarily public) and cloned into `C:\apps\RMS`
- Backend and frontend packages were installed (`npm install` in both folders)

---

## Network

- Ran `ipconfig` on the RDP machine to confirm the server IP
- Used that IP for web/API access configuration

---

## IIS sites

Two sites were created and bound:

| Site | Purpose |
|------|---------|
| **rms-web** | Frontend (web UI) |
| **rms-api** | Backend API |

---

## Database

- PostgreSQL was configured on the same RDP machine
- Backend `.env` points to local DB:

```text
Host: 127.0.0.1
Port: 5432
```

- Prisma schema was applied
- Dummy / login seed data was loaded (`npm run seed`)

### Seeded Super Admin (demo)

| Field | Value |
|-------|--------|
| Email | `admin@ricefield.com` |
| Username | `superadmin` |
| Password | `AdminPassword@123` |

---

## Result

- RMS is running on the RDP server
- UI served via **rms-web**
- API served via **rms-api**
- Database and demo login are ready for client use

---

## Path on server

```text
C:\apps\RMS\
├── backend\
├── frontend\
├── docs\
└── README.md
```
