# Feedback 32 — Boli Record Walkthrough

PDF: `docs/Precuremnet Boli section (feedback 32).pdf` (read twice before implement).

## What changed

### Schema (`Plant`, `PaddySodaPending`, `PaddyBoli`)
- Mill-wise `nextBoliSeq` → chronological Boli Nos (`{PLANTCODE}-B0001`)
- Boli: `boliNo`, `finalBags`, `artiaBillChecked`, `payment`, `isCancelled`
- Soda: `supervisorName`, `biometricData`, `dailyUpdateCount`, `cancelCount`

### Backend APIs
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/procurement/boli-records/:plantId` | Flattened Table 01 (FIFO Artia, filters, page size) |
| GET | `/api/procurement/bolis/open-for-final/:plantId` | Boli No dropdown for Final Boli |
| GET | `/api/procurement/supervisors/:plantId` | Supervisor dropdown |
| GET | `/api/procurement/soda-pending/detail/:id` | Edit estimate load |
| PUT | `/api/procurement/bolis/:id/final` | Submit Final Bags + fingerprint |
| PUT | `/api/procurement/bolis/:id/complete` | Individual complete + 5% admin alert |
| POST/PUT | `/api/procurement/soda-pending` | Estimate create/update with fingerprint, 2/day, cancel rules |

Payment (backend): `(GovtRate − BoliRate) × FinalBags × 0.375`  
Final Hisab = sum of boli payments on that estimate.

### Frontend
- Nav tab renamed **Boli Record**
- New `BoliRecordPanel` (Table 01 + filters Artia→Mandi→Dates + page 10/50/100 + **Add Final Boli**)
- Supervisor: Export hidden
- Estimate modal: supervisor + fingerprint; empty rows skipped; bags `0` = cancel
- Paddy Inward: individual complete only (no bulk soda complete); cancelled bolis hidden; 5% confirm

## Manual retest checklist (do twice)

1. Open Procurement → **Boli Record** (not “Paddy Purchase & Quality”).
2. Filters order: Artia, Mandi, From, To — selecting Artia shows that Artia’s rows FIFO.
3. Page size 10 / 50 / 100 works; Export All (non-supervisor) ignores page limit.
4. **Add Estimate Purchase**: 4 rows default; fill 2 only → saves; each gets Boli No; fingerprint required (Admin can bypass if scanner down).
5. Cancel: set bags `0` on a row (≤3 cancels); cancelled boli **not** in Paddy Inward receive list.
6. Update same day twice OK; 3rd update blocked; supervisor cannot edit back-dated.
7. **Add Final Boli**: pick Boli No → auto Artia/Mandi/M/C/Est/Rate; Bill=No locks Final Bags/Submit; Bill=Yes + Final Bags + fingerprint → Payment uses Final Bags; >15% vs estimate → Admin audit log.
8. Table shows Received / Balance / Complete (view-only).
9. Paddy Inward: enter Bags Rec Today; tick Complete → confirm **only if within ±5%**; outside 5% is **blocked** and Admin notified; Complete column updates on Boli Record.
10. Supervisor login: no Export/Print buttons; can open Procurement → Boli Record.
11. Edit estimate: Boli UUIDs stay the same (inward receive history not orphaned).
12. Print All opens printable sheet of **all** filtered rows (not page-limited).

## Restart note
Backend must be restarted after schema push so Nest loads new Prisma fields/routes (`npm run start:dev` in `backend`).
