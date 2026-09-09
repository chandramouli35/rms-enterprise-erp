# Feedback 29 — Sale / Purchase Report Walkthrough

Source: `docs/Sale and Purchase Report (feedback 29).pdf`

## Setup

```powershell
cd backend
npx prisma generate
npx prisma db push
```

Restart BE + FE. Admin: open Sale Report → **Backfill missing** once if older GPs exist.

## A. Navigation & mill drawer

- [ ] Finance → Sale / Purchase with **Select Mill** in the page header (inline; applies immediately)
- [ ] Z payment edit with All mills does **not** collapse to one plant

## B. Pipeline

- [ ] Non-draft GP + finance soda → report row for that mill
- [ ] Draft GP → **no** soda mill cell / status change and **no** quota burn until submit/complete (aligned)
- [ ] Multi-mill soda → H serials 01, 02, 03 by submit order across mills
- [ ] Cancel GP → row removed; soda K rolls back

## C. Columns A–AA

- [ ] A–F soda; G Bill; H serial; I–M from GP (`ntWtParty` = R)
- [ ] **N** Yes/No (default No); Yes needs Plastic/Jute; tare Plastic 0.002 / Jute 0.010 Qtl/bag from Q & R
- [ ] Tare > mill or party net → error
- [ ] **O** required for Rice Bran; **P** live on keypress = `If(O-1>15,(O-1-15)/2+15,O-1)`
- [ ] Bran without O → V/W/Y blocked (no plain-rate fallback)
- [ ] **S** = min(Q,R) billing highlight; **T** signed Q−R; **U** = Q/L or 0
- [ ] **V** = D; Bran = P×D; **W** = V×S; **X** CD%; **Y** = W−W×X/100
- [ ] **Z** Admin only → soda L + **Payment audit** panel
- [ ] **AA** note Admin

## D. Soda K

- [ ] Deals Payment (K) = sum of Y for that soda

## E. Near real-time

- Full websocket not required for correctness: **3s poll** + server sync on GP create/complete/update (PDF “no page refresh”)
- Ledger mirror of Y → **F31** (done)
