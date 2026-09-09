# Feedback 28 — Finance Section (Soda / Deals) Walkthrough

Demo checklist against `docs/Finance section (feedback 28).pdf`. **Every F28 checkbox must pass.**

## Setup (once)

1. `cd backend` → `npx prisma generate` → `npx prisma db push`
2. `node migrate_permissions.js` (adds **Finance** module + subs)
3. Users → Permissions → grant Finance → Save → **re-login**
4. Restart BE + FE

## A. Navigation

- [ ] Sidebar **Finance** visible (roles with permission)
- [ ] Subs: Deals / Soda Record, Sale, Purchase, Receivables, Payables, Payment Received, Payment Paid
- [ ] Sale / Purchase / Receivables / Payables / Payment* = placeholder panels (F29 / F31)
- [ ] No Finance permission → module hidden + Access Denied

## B. Add Soda

- [ ] Tab opens with historical sodas + **Add Soda**
- [ ] Date picker, default today, backdate OK, future blocked
- [ ] Soda Type Sale / Purchase → lands on matching report
- [ ] Mill: search filter + multi-select from plant master
- [ ] Item: search filter + dropdown from products
- [ ] Party: search filter; Client/Party or Mill (inter-mill); multi-mill blocks mill-as-party
- [ ] Rate: **Numeric** or **Shift** radio
- [ ] Count integer > 0; Soda No readonly auto (Sale series ≠ Purchase series)
- [ ] Note free text
- [ ] Confirm Save / Cancel; Cancel keeps filled form
- [ ] New row at top of respective report (by createdAt)

### Case study 01 (Shift)

- [ ] Sale + Goyal + Party Beas + Shift + qty 3 → Sale on Goyal + auto Purchase on Beas (swapped), both Shift

## C. Soda Report A–M

- [ ] Sale Soda Report / Purchase Soda Report toggles
- [ ] Columns A–M incl. dynamic mill columns (all plants)
- [ ] Selected mills highlighted; others `0`
- [ ] Status `0/N` → `d/N` → **Completed** at full
- [ ] Payment (K) = sum of Sale/Purchase Net Payment (Y) for that soda (Feedback 29 sync; shows `0` until GPs submitted)
- [ ] Payment Status (L): Clear / Underway / Not Clear — **Admin only** (`SUPER_ADMIN` / `ADMIN`)
- [ ] Sale #N payment change does **not** affect Purchase #N
- [ ] Admin mid-deal edit count + note while **not** Completed (API rejects Completed)

## D. Gate Pass (core)

- [ ] IN → only Purchase sodas with remaining > 0 for **this mill**
- [ ] OUT → only Sale sodas with remaining > 0 for **this mill**
- [ ] Switching IN↔OUT clears soda selection
- [ ] Soda dropdown or Not Applicable (BE requires one of the two)
- [ ] Operational items + Soda N/A → notify Admin + **that mill’s** supervisors
- [ ] Bill No or Not Applicable (required)
- [ ] Bag Type Plastic / Jute / Not Applicable (required)
- [ ] Mill cells + status update after GP create
- [ ] Over-quota blocked (incl. concurrent create — transactional lock)
- [ ] **Cancel** ACTIVE or COMPLETED GP (recent list + report) → status CANCELLED → soda count rolls back (2/3 → 1/3)
- [ ] Draft GP does not change mill cells / status / remaining until submit or complete

## E. Explicitly next feedback (stubs OK)

- Sale / Purchase Report tables → **F29** (Section K real bill sync)
- Junction → **F30**
- Ledger / Receivables / Payables / Funds → **F31**
