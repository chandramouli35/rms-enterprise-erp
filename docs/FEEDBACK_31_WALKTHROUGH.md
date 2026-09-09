# Feedback 31 — Ledger, Receivables & Payables Walkthrough

Source: `docs/Ledger & payable and receivables (Feedback 31).pdf`  
**API retest: 16/16 passed (backfill, AR/AP, payments, statement, report update sync).**

## Setup

```powershell
cd backend
npx prisma generate
npx prisma db push
npm run start:dev
```

Optional demo data (also syncs F31 ledger):

```powershell
npm run seed:finance
```

Or in UI: Finance → Receivables → **Sync ledger from reports**.

## A. Report → Ledger sync

- [ ] New / updated Sale or Purchase report line creates/updates a ledger row
- [ ] SALE → **Debit** = Net Payment (Y); PURCHASE → **Credit** = Y
- [ ] Narration includes **Soda No.** (and GP when present)
- [ ] Cancelled GP removes the linked ledger row

## B. Payment Received

- [ ] Finance → **Payment Received**
- [ ] Fields: Party, Date, Narration, Amount, Notes (+ optional Soda)
- [ ] Save credits party ledger; appears in recent list + Party Ledger

## C. Payment Paid

- [ ] Finance → **Payment Paid**
- [ ] Fields: Party, Date, Narration, Amount Paid, Notes (+ optional Soda)
- [ ] Save debits party ledger

## D. Receivables (Sale)

- [ ] Default **Owing only** filter (parties with outstanding &gt; 0)
- [ ] Totals: Total Billed / Total Received / Net Outstanding
- [ ] Expand party → soda-wise unsettled balances
- [ ] **Ledger** opens chronological statement

## E. Payables (Purchase)

- [ ] Same pattern (Payable only filter)
- [ ] Soda drill-down + Party Ledger

## F. Party Statement

- [ ] Columns: Date | Soda/Deal | Mill | Type | Debit | Credit | Running Balance
- [ ] Date range + search (**Apply** uses server filter)
- [ ] Export Excel + PDF

## Depends on

F28 sodas + F29 Sale/Purchase lines (Section Y).
