# Feedback 30 — Junction Report Walkthrough

Source: `docs/Junction Report (feedback 30 ).pdf`  
**Every checkbox below must pass for 100%.**

## Setup

```powershell
cd backend
node migrate_permissions.js
```

1. Users → Permissions → grant **Finance → Junction Report** (and parent Finance) → Save  
2. **Re-login**  
3. Restart BE if you pulled new `junctionReport` code  
4. Optional demo data: `npm run seed:finance`

## A. Navigation

- [ ] Sidebar **Finance → Junction Report**
- [ ] Opens Sale Junction by default (toggle to Purchase Junction)

## B. Global filter (compact searchable pickers — not Excel bare selects)

- [ ] Separate **Sale** / **Purchase** toggle in the header
- [ ] **Party Name** + **Soda Number** are compact search dropdowns (sheet stays the main focus)
- [ ] Soda list includes **Clear / Underway / Not Clear** with status badges
- [ ] Selecting Party narrows Soda list to that party’s sodas
- [ ] Selecting Soda sets Party and shows that soda’s lines
- [ ] Clearing Party / Soda works; party list stays fully switchable
- [ ] Sheet empty until Party or Soda selected

## C. Cross-mill sheet (Table 01)

- [ ] After filter: full **A–AA** columns + Mill, from **all mills**
- [ ] Party selected → all sodas for that party, multiple soda groups allowed
- [ ] Soda (+ Party) selected → rows stitched serial-wise across mills
- [ ] Ordered by **Soda Number**, then **H Serial No.**
- [ ] After each soda group: **Soda No. XX · Total Receivables** (Sale) or **Total Payables** (Purchase)
- [ ] **Grand Total Receivables / Payables** at the bottom (sum of Net Payment Y)
- [ ] Header shows Party Name when filtered

## D. Export / Print

- [ ] **Export** → Excel with line rows + soda summary rows + grand total
- [ ] **Print** → sheet + summaries (filters hidden)

## E. Depends on

Feedback 28 sodas + Feedback 29 Sale/Purchase lines (`npm run seed:finance` for Sanjay / Bran demo).

## Out of scope (Feedback 31)

Receivables / Payables / Payment Received / Payment Paid ledger depth.
