# Final Audit — Feedbacks 32 / 33 / 34 / 35

Hard re-audit + remaining-gap closure (2026-09-11).

## Honest status

**Core workflows for F32–F35 are implemented.** Remaining items from the skeptical audit were closed in this pass:

| Gap | Fix |
|-----|-----|
| F32 Admin cannot edit Table 01 Payment/Hisab/Note | Admin edit modal + `PUT /bolis/:id/admin-table01` |
| F32 Final Boli different supervisor | Locked to estimate supervisor (BE + FE) |
| F32 Supervisor dropdown lists everyone | Supervisor sees only self |
| F35 Artia A→Z + weak within-artia order | Clusters by latest unload; within artia Latest→Oldest |

## Known acceptable nuances (not blockers)

| Item | Why acceptable |
|------|----------------|
| Received Bags on inward bag entry (not only Complete tick) | PDF also requires continuous sum across GPs until Completed; bags attach when boli is selected on inward |
| Truck 2h at inward save (not GP cut) | Matches Paddy Inward GP lifecycle in this app |
| Daily shortage = till-date balances | Matches PDF “Till date Shortage balance” |
| Extra mills beyond Goyal/Beas/Rajoa | Named mills in PDF matrix; extras still appear as columns |

## Verdict

**Yes for operational sign-off on Feedbacks 32–35 PDF requirements** — after restarting backend. Spot-check: Admin Table 01 edit, Final Boli same supervisor, Mandi/Artia Latest→Oldest clusters, evening fingerprint submit.
