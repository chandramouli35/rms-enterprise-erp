# Feedback 34 — Shortage Report Walkthrough



PDF: `docs/Shortage Report update (feedback 34).pdf`



## Recheck fixes

- Evening auto-update: **Submit Daily Report** UI + GP evening finalize hook + **7:05 PM cron** snapshot (`DailyShortageSnapshot`)
- GP finalize always upserts **global** snapshot (plus plant-scoped copy); daily reader falls back to any plant snapshot if global missing
- **Auto Narration** checkbox in Paddy Inward §8 (default ON) with live preview; OFF allows manual narration text
- Narration moved to **last column** of ledger
- Section 5 shortage bags credit shown on inward Artia shortage totals
- Legacy explode no longer double-counts Inform Bauji excess vs shortage-bags credit



## Views

1. Daily Consolidated (snapshot if submitted, else live)

2. Artia Till-date balances

3. Ledger / Narration (last column)



## Retest

1. Confirm inward with shortage bags + weight shortage → two ledger rows, same truck.
2. Artia total on form drops by shortage bags × 0.382.
3. Section 8: **Auto Narration** ON shows live preview; OFF allows editing; confirm stores correctly.
4. Click **Submit Daily Report** → banner shows Submitted + source.
5. Finalize evening GP report → **global** shortage snapshot updates Daily Consolidated.
6. Graph shows increasing mills.


