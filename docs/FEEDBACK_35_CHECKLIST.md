# Feedback 35 — Paddy Inward List Checklist

Source: `docs/Paddy Inward List (feedbak 35).pdf` (3 pages). Re-audited after gap fixes 2026-09-11.

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Dual lists: **Govt** (Agency GP) + **Mill** (Actual Bags) | PASS |
| 2 | Header totals: Agency GP / Mill / Shortage / Total bags | PASS |
| 3 | Govt Mill Net Wt = bags × 0.382 (or 0.381) | PASS |
| 4 | Data from Paddy Inward; mill-wise; **filter by entryDate** | PASS |
| 5 | Evening fingerprint submit both lists + confirm popup (**device/capture validated**; supervisor cannot ADMIN_BYPASS) | PASS |
| 6 | Cumulative unload-order list (desc) + totals at end | PASS |
| 7 | Active GP count indicator (**polls every 30s**) | PASS |
| 8 | Date-range filters; print date-wise (new page / date) | PASS |
| 8a | Print shows **same evening submitted snapshot** when single-day | PASS (`snapshot=1`) |
| 9 | Mandi & Artia sections **below** inward list (Govt + Mill) | PASS |
| 10 | Mandi select → all artias L→O; print includes all artias | PASS |
| 11 | Artia select → that artia, season L→O | PASS |
| 12 | Auto-send Daily Paddy Summary to mill on evening submit | PASS |
| 13 | Daily Inward Summary in Procurement Reports | PASS |
| 14 | Daily shortage + **Artia-wise shortage** section in Reports | PASS |
| 15 | Mandi Balance dashboard (Goyal/Beas/Rajoa; Opening/Today/Total bags) | PASS |
| 16 | Auto-generated; Today Arrival = 0 if no lifting | PASS |
| 17 | Opening / Today bucketed by **GP completion** (`gpCompleteDate`) | PASS |
| 18 | Mill list 3× A/B columns (**Mill / Shortage / Total headers above A/B**) | PASS |
| 19 | Actual Received Bags + Bags at Agency GP columns | PASS |
| 20 | Confirmed-only report rows (drafts screen-only for Continue) | PASS |

See `docs/FEEDBACK_35_WALKTHROUGH.md`.
