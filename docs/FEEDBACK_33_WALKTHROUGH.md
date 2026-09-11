# Feedback 33 — Paddy Inward Walkthrough

PDF: `docs/Paddy Inward (feedback 33).pdf`

## Gap closure (recheck)

- Pending Bolis: **visible + disabled** when Mandi Type = Control (not hidden)
- Stack drawing button for **all mills** (occupied stacks still plant-scoped)
- Weighbridge Fetch: real GP/WB weights only — **no hardcoded 9400**
- Draft persist/reload: `mandiType`, remarks, discrepancy, mandi intimation, times, bags
- Khali block moved to **after Section 8**
- Excess recovery UI gated on **Inform Bauji**; Required wt = agency + shortage bags; auto `netWtDiff`
- Mandi GP dedupe scans all historical rows (normalized)

## Retest
1. Control → Pending Bolis table visible but not editable
2. Non-Beas mill → stack Layers button opens drawing; stacks from that plant
3. Fetch with truck that has no WB/GP weights → toast error (no fake number)
4. Save Draft → Continue Draft → remarks / Mandi Type / intimation still filled
5. Excess weight + Inform Bauji → recovery; without tick → no recovery
6. Confirm → Time Out punched; Khali after §8
