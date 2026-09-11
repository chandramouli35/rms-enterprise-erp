# Feedback 35 — Paddy Inward List Walkthrough

PDF: `docs/Paddy Inward List (feedbak 35).pdf`

## Recheck fixes (gap closure)

- Mandi & Artia clusters shown **below** main Govt/Mill lists (not only a separate tab)
- Mill list has **three** A/B pairs: Mill / Shortage / Total
- Print: date-wise pages **plus** full Mandi/Artia cluster pages
- Artia filter expands date range to **season** (1 Oct → today) for L→O season data
- Unload sort uses unload time / timeOut then GP descending
- Evening submit notifies Supervisor + Plant Manager (“Daily Paddy Summary sent to mill”)
- Daily Inward Summary embeds **Artia-wise shortage** table
- Print CSS hides screen tables so only print layout renders
- Single-day view loads **evening snapshot** (`snapshot=1`) so print matches submitted report
- Mandi Balance Opening/Today uses **GP `gpCompleteDate`** (not batch createdAt)

### Reports
- **Daily Inward Summary** — auto / snapshot after evening submit
- **Mandi Balance** — Goyal / Beas / Rajoa columns (Opening, Today Arrival, Total) in bags
- **Shortage Recovery** — Artia-wise shortage (Feedback 34)

### Backend
- `GET /api/procurement/reports/inward-list`
- `POST /api/procurement/reports/inward-list/submit`
- `GET /api/procurement/reports/daily-inward-summary`
- `GET /api/procurement/reports/mandi-balance-dashboard`
- `GET /api/procurement/reports/active-gps`
- Model: `DailyInwardListSnapshot`
- Evening GP finalize also snapshots inward lists (Feedback 35)

## Retest
1. Open Inward List → switch Govt / Mill; check totals and columns.
2. Change bag wt 0.382 ↔ 0.381; Govt Mill Net updates.
3. Filter Mandi → Mandi & Artia shows all artias L→O; filter Artia → one cluster.
4. Print with multi-day range → each date on new page.
5. Submit Evening Lists with fingerprint → Daily Inward Summary shows submitted.
6. Mandi Balance → mandis with no today lifting show Today Arrival = 0.
