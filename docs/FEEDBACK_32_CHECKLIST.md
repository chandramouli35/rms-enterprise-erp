# Feedback 32 — Procurement Boli Record (Checklist)

Source: `docs/Precuremnet Boli section (feedback 32).pdf` (re-audited 2026-09-11).

## A. Naming & Access

| # | Requirement | Status |
|---|-------------|--------|
| A1 | Rename to **Boli Record** | PASS |
| A2 | Supervisor: no Export/Download | PASS |
| A3 | Double-click Submit → 1 save | PASS |
| A4 | Rename to **Add Estimate Purchase** | PASS |

## B. Entry Visibility & Filters

| # | Requirement | Status |
|---|-------------|--------|
| B1–B6 | Flat bolis, Artia cluster, filter order, FIFO, page size 10/50/100 | PASS |
| B7 | Larger data area / reduce module & sub-module tab size | PASS (Procurement sub-tabs denser `text-[11px] py-1`) |
| B8–B9 | Export/Print all filters; date + Artia | PASS |

## C. Estimate Purchase Form

| # | Requirement | Status |
|---|-------------|--------|
| C1–C6 | 4 rows, skip empties, bags=0 cancel, max 3 cancels (+ Admin notify on create/update) | PASS |
| C7 | Supervisor dropdown | PASS |
| C8 | Same supervisor fingerprint on update | PASS (capture + name + RD device `dc`/`mi`/`hmac`) |
| C9–C11 | Chronological Boli No; moisture/bags/rate rules | PASS |
| — | Double-click Submit guard (lock after validation only) | PASS |
| — | Payment driven from Final Bags × 0.375 (not estimate bags) | PASS |

## D–E. Final Boli & Table 01

| # | Requirement | Status |
|---|-------------|--------|
| D1–D10 | Final Boli section end-to-end | PASS |
| E1–E5 | Table 01 columns, payment formula, **Final Hisab = compounding Payment (H)**, edit rules | PASS |
| — | Settle Hisab Admin-only (Payment/Hisab from Final Bags) | PASS |

## F. Completion & Tolerance

| # | Requirement | Status |
|---|-------------|--------|
| F1–F4 | Individual complete; ±5% block; sync Complete column; **estimate update cannot set Final/Complete** | PASS |
| F5 | >15% Final vs Est → **Admin Notification** (bell) | PASS |
| F6–F8 | Cumulative received; confirm popup | PASS |
| F9 | Outside 5% → API called → Admin Notification + reject | PASS |

See `docs/FEEDBACK_32_WALKTHROUGH.md`.
