# Rice Mill Management System (RMS)

Multi-plant operations platform for rice mill procurement, production, yield, inventory, weighbridge, gate pass, staff, and dryer workflows — with JWT authentication and role-based access control (RBAC).

## Repository structure

```
RMS/
├── backend/          # NestJS API + Prisma + PostgreSQL
├── frontend/         # React (Vite) admin UI
├── docs/             # Walkthroughs, PDFs, requirements notes
├── MILESTONE_4_CLIENT_QUESTIONS.md
└── README.md         # This file
```

## Tech stack

### Backend
| Area | Technology |
|------|------------|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| Language | TypeScript |
| ORM / DB | Prisma 7, PostgreSQL |
| Auth | Passport JWT, bcrypt |
| Validation | class-validator / class-transformer |
| Scheduling | `@nestjs/schedule` (e.g. gate-pass jobs) |
| Uploads | Multer + Cloudinary (truck images, etc.) |

### Frontend
| Area | Technology |
|------|------------|
| Framework | React 19 |
| Build | Vite 8 |
| Language | TypeScript |
| Routing | React Router 7 |
| State | Zustand |
| Data fetching | Axios (+ TanStack Query available) |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Exports | SheetJS (`xlsx`), jsPDF |
| Icons | Lucide React |
| Lint | Oxlint |

## Features (high level)

- **Dashboard** — plant metrics, charts, alerts, notifications  
- **Procurement** — suppliers, mandis, paddy purchase/inward, stacks, reports  
- **Production** — batches, stock reports, intermill, compare  
- **Yield Mgmt** — mill benchmarks, rice/paddy yield, stock health, consignment  
- **Inventory** — stock by product type, adjustments, ledger  
- **Transfer** — inter-plant transfer request / tracking  
- **Weighbridge** — capture, history, settings  
- **Gate Pass** — create, report summary, transfer entry, QR  
- **Staff Management** — drivers, labour, pahunch, trucks  
- **Dryer Work** — GOYAL / RAJOA / BEAS agro logs  
- **Users and Roles** — users, roles, **Permissions** (RBAC matrix)  
- **Products / Plants** — master data  

**Milestone 4** (Dispatch, Power, Backup) source remains in the repo for later enablement; nav entries are deferred until product sign-off. **Finance** (Feedback 28+) is enabled for Deals/Soda; Sale/Purchase/ledger depth continues in Feedbacks 29–31. See `MILESTONE_4_CLIENT_QUESTIONS.md`.

RBAC: module/tab visibility on the UI and API guards on the backend. Shared dropdown/lookup APIs allow access when the user has **any** module that needs that data (e.g. Gate Pass can load suppliers without unlocking Procurement screens).

---

## Prerequisites

- **Node.js** 20+ and npm  
- **PostgreSQL** (local or hosted, e.g. Supabase)  
- Optional: **Cloudinary** account for image uploads  

---

## Backend setup

```bash
cd backend
npm install
```

### Environment

Copy the example file and fill in values:

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `PORT` | API port (default `3000`) |
| `CLOUDINARY_*` | Optional image upload credentials |

### Database (Prisma)

```bash
npx prisma generate
npx prisma db push
```

**Finance demo data (Feedback 28/29)** — plants, products, parties, sodas, gate passes, and Sale/Purchase report rows:

```bash
npm run seed:finance
```

This seeds the real masters the Add Soda dropdowns read (`Plant`, `Product`, `FinanceParty`) and the full pipeline into Sale/Purchase Report (`FinanceSoda` → non-draft `GatePass` → `FinanceSalePurchaseLine`). Re-running clears previous `[SEED_FINANCE]` rows and recreates them.

Base roles/admin (optional):

```bash
npm run seed
```

After RBAC module list changes, you may run:

```bash
node migrate_permissions.js
```

This **adds** missing permission rows only (does not wipe existing grants). Re-save roles in **Users → Permissions** and have users **re-login** so JWT picks up permissions.

### Run

```bash
npm run start:dev          # watch mode → http://localhost:3000
npm run build && npm run start:prod
```

If you see `EADDRINUSE :::3000`, another Node process is still bound to the port — stop it before starting again.

---

## Frontend setup

```bash
cd frontend
npm install
```

### Environment

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `VITE_RMS_BACKEND_URL` | Backend base URL (e.g. `http://localhost:3000`) |

### Run

```bash
npm run dev                # Vite → usually http://localhost:5173
npm run build              # production build
npm run preview            # preview production build
```

Log in with a seeded / admin user, select a plant, then open modules according to that role’s permissions.

---

## Typical local workflow

1. Start PostgreSQL and ensure `DATABASE_URL` is valid.  
2. `cd backend && npm run start:dev`  
3. `cd frontend && npm run dev`  
4. Open the Vite URL, sign in, confirm plant context in the header.

---

## Project conventions

- **Plant context:** most APIs expect `Authorization: Bearer <token>` and often `x-plant-id`.  
- **Permissions:** configured under **Users and Roles → Permissions**; SUPER_ADMIN bypasses checks.  
- **Do not commit** `.env` files or `node_modules` / `dist` build output.

---

## License

Private / unlicensed application code — internal use unless otherwise agreed.
