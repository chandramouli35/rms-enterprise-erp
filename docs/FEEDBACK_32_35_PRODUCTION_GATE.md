# Production Gate — Final QA Audit (Feedbacks 32–35)

**Auditor role:** Senior QA Lead  
**Sources:** `docs/_f32_utf8.txt` … `_f35_utf8.txt`  
**Date:** 2026-09-11  
**Build:** post blocker-fix (PENDING excluded; evening inward freezes shortage)

---

## Verdict: **CONDITIONAL GO**

Core PDF workflows for F32–F35 are implemented and production-usable after the blocker fixes below.  
**Not** a blind “100% every pixel matches PDF.” Remaining items are LOW/MEDIUM UX nuances, not financial blockers.

| Feedback | PASS | PARTIAL | FAIL | Gate |
|----------|------|---------|------|------|
| **32** Boli Record | ~46 | ~5 | 0 | **GO** |
| **33** Paddy Inward | ~58 | ~5 | 0* | **GO** |
| **34** Shortage Report | ~20 | ~2 | 0 | **GO** |
| **35** Inward Lists | ~34 | ~4 | 0 | **GO** |

\*Truck 2h on draft is **PASS vs PDF** (“prevent repeat entry within 2h”), not a fail.

---

## Blockers fixed before this sign-off

| Issue | Fix |
|-------|-----|
| Till-date / trend / ledger included **PENDING** inwards | Status filter → `CONFIRMED` + `COMPLETED` only |
| Evening inward submit did not freeze shortage report | `submitEveningInwardLists` now also calls `submitDailyShortageReport` |
| Manual shortage submit `submittedBy: 'Supervisor'` | Uses logged-in username |

---

## Remaining PARTIAL (acceptable for go-live)

| Sev | Item | Notes |
|-----|------|-------|
| MED | Boli register pagination | Export/Print All bypasses page limit; use page size 100 for full Artia view |
| MED | Weighbridge is Fetch-button, not silent auto-poll | Manual fetch + calc present; ops must train “Fetch from WB” |
| MED | “Auto-send to mill” = in-app Notification + Reports | No SMTP; summary visible under Daily Inward Summary |
| LOW | Final Boli supervisor read-only for SUPERVISOR | Locked to estimate author (stricter = safer) |
| LOW | Responsive unload rows may wrap on small screens | Desktop yard PCs OK |
| LOW | Received Bags accumulate on inward confirm (boliInputs), Complete is separate | Matches continuous GP summing until Complete |
| LOW | Multi-day print without evening snapshot uses live data | Submit evening before print for frozen report |

---

## Must-pass smoke tests (production day-1)

1. **Boli:** Create Estimate (2 of 4 rows) → Final Boli (>15% → Admin bell) → Inward bags → Complete (±5%).
2. **Supervisor:** No Export on Boli Record; current-day edit only; fingerprint on estimate update.
3. **Inward:** Control = pending view-only; Boli = editable; Mandi GP `EGP-1` vs `egp 1` blocked.
4. **Truck:** Active unload blocked globally; after COMPLETE, new trip blocked &lt; 2h.
5. **Shortage:** Quality cut + bags less + shortage bags received → separate ledger rows + Auto Narration.
6. **Inform Bauji:** Bags-less skips bags shortage debit; weight shortage still posts; Admin notification.
7. **Evening:** Inward List fingerprint submit → snapshot badge + Daily Inward Summary + Daily Shortage frozen.
8. **Cron:** Confirm server TZ / Nest cron `5 19 * * * Asia/Kolkata` after deploy.
9. **Mandi Balance:** Opening/Today/Total bags; Today=0 when no completed GP.
10. **PENDING check:** Draft inward with shortage must **not** appear in till-date balances.

---

## Deploy checklist

- [ ] Backend restart after this build (`0` tsc errors)
- [ ] `prisma db push` / migrate if any schema drift on snapshots
- [ ] Verify Morpho RD / fingerprint path on mill PCs
- [ ] Confirm plant names match Goyal / Beas / Rajoa regex for consolidated columns
- [ ] Train supervisors: evening submit both lists; WB Fetch button; page size 100 on Boli Record

---

## Sign-off statement

**CONDITIONAL GO for production** on Feedbacks 32–35: financial formulas, completion rules, shortage ledger, evening freeze paths, and inward lists meet PDF intent. Remaining PARTIALs are operational/UX — track as post-go-live polish, not release blockers.
