# Feedback Demo Script — 03 · 17 · 19 · 21

What we fixed + how to verify in tabs. Same style as `FEEDBACK_11_12_20_22_WALKTHROUGH.md`.

**Covered:** Feedback **03** · **17** · **19** · **21**

### Before you start (you run Prisma)
```bash
cd backend
npx prisma generate
npx prisma db push
# optional: npx prisma db seed
```
Restart `npm run start:dev` so `MillYieldBenchmark` / `ConsignmentDispatch` / `PaddyUsageRecord` are on PrismaClient.

---

## Act 1: Mill Yield Benchmarks (Feedback 03)

*Goal: DB-backed required qty + yield % + round fig; Compare Reports use these; targets 71% paddy / 66.2% rice.*

**Where to go:** Sidebar → **Yield Mgmt** → **Mill Yield Benchmarks**

### What we fixed
1. Benchmarks stored in DB (Paddy, Net rice, kani, nakku, Rejection, Bran, K.Phuck, Husk, Purchased Rice)
2. Columns: Required Qty · Yield % Paddy · Yield % Rice · Round Fig % Rice
3. Edit any row (label + numbers) and save
4. Soft-delete / deactivate a row
5. Editable targets: **71% of paddy** · **66.2% of rice** (Save Targets)
6. Compare Reports / Yield Diff read **round fig %** from this DB (not hardcoded)

### How to verify
**Step 1:** Open **Yield Mgmt → Mill Yield Benchmarks**  
→ Seeded rows match Feedback 03 table (e.g. Bran 12.8, K.Phuck 3.7).

**Step 2:** Edit Round Fig % on one item → Save  
→ Refresh → value persists.

**Step 3:** Change Target % Paddy / Rice → **Save Targets**  
→ Header / targets bar shows new values.

**Step 4:** Go **Yield Mgmt → Yield from Rice** (or Compare)  
→ Diff vs benchmark uses the Round Fig you saved.

**Step 5 (optional):** Trash icon on a row → deactivated / gone from active list.

---

## Act 2: Yield from Rice / Paddy (Feedback 17)

*Goal: Consolidated mill compare from operational stock; Daily default; Format 1 / Format 2; paddy weekly usage.*

**Where to go:** Sidebar → **Yield Mgmt**  
→ **Mill Yield Benchmarks** · **Yield from Rice** (1st report) · **Yield from Paddy** · Stock Health · Consignment …

### What we fixed
1. Operational stock only (not finance / non-ops)
2. Benchmarks aligned with Feedback 03
3. Auto opening / stock-in-hand
4. Manual **Paddy Usage** only (Hoodi / Dryer / Silos) + fingerprint
5. Section order: Rice → Paddy → Stock Health → Consignment
6. Consolidated firms: Goyal · Beas · Rajoa (+ averages)
7. Period: **Daily** (default) · Weekly · Monthly · Range · Till Date
8. Daily = production batches **+ always intermill**
9. Denominator: **Net Rice** (rice basis) · **Paddy Used** (paddy basis)
10. Net Rice formula: stock + dispatch − purchased usage
11. Purchased = Mansoori + Wand + Parmal + FRK
12. By-products = stock + sale − purchase/inward (+ intermill)
13. Bags / Weight toggle (weight prefers Consignment Dispatch net weight mill)
14. Export **SUPER_ADMIN only** (supervisor cannot export)
15. **Format 1** = multi-page PDF (one page per day/week/month slice)
16. **Format 2** = on-screen datesheet (mill × dates × items + Avg + Diff)

### How to verify
**Step 1:** **Yield Mgmt → Yield from Rice**  
→ Period = Daily · table like Table B · Goyal / Beas / Rajoa · Diff under items.

**Step 2:** Switch Bags ↔ Weight · Weekly / Monthly / Till Date  
→ Numbers recalculate; denominator stays Net Rice.

**Step 3:** SUPER_ADMIN → set From/To → **Format 1**  
→ Multi-page PDF downloads (one page per slice).

**Step 4:** SUPER_ADMIN → pick mill → **Format 2**  
→ Datesheet view with Avg + Diff vs benchmark.

**Step 5:** **Yield from Paddy → Paddy Usage**  
→ Enter weekly usage → Scan fingerprint → Submit  
→ Paddy Used row updates; Diff uses paddy benchmarks.

**Step 6:** Login as Supervisor  
→ Export buttons hidden / blocked.

---

## Act 3: Consignment Dispatch Details (Feedback 19)

*Goal: 4th Yield section; fill after GP report; wagons = Main÷580; incomplete reminders; lock filled fields.*

**Where to go:** **Yield Mgmt → Consignment Dispatch** (4th)  
Also: Supervisor Dashboard card · popup after GP Finalize / Transfer confirm

### What we fixed
1. 4th section under Yield Management
2. Popup after **Finalize Daily GP Report**
3. Supervisor dedicated access (nav + dashboard card)
4. Protocol: if GP report not ready → reminder; cancel → max **1 backdate**
5. Form: Date · Nil checkbox · Mark GP (multi) · FCI GP No · Consignment No · Bags / Shortage (auto) · FCI Moisture/Damage/Discolour/Broken · Depo Weight · Portal Weight · Fingerprint
6. Mill-wise report columns incl. **Depo Details**
7. **Add More** after an entry
8. Tap row → fill **only blank** fields (pre-filled locked)
9. Daily **8 AM** reminder until previous day missing **or incomplete**
10. Multi FCI / multi-truck same Consignment No (sum bags · max 580)
11. Nil day: skip form fields · still fingerprint · **hidden** from report list
12. **Dispatch Delivery Status** banner = Total Main ÷ 580 wagons
13. Transfer GPs: Actual Dispatch Mill **cannot** create consignment (recipient does)

### How to verify
**Step 1:** Gate Pass → Report → **Finalize Daily Report** (checkbox + Scan)  
→ Consignment modal pops up → fill → Scan → Submit.

**Step 2:** Supervisor login → Dashboard → **Consignment Dispatch Details** card  
→ Opens form / Yield consignment section.

**Step 3:** **Add More** → tick **Today No Consignment dispatch** → Scan only  
→ Success · row **not** listed in mill report.

**Step 4:** Normal entry → pick date → multi-select GPs → bags auto  
→ Fill FCI fields → Scan → table shows Depo Details + GP No.

**Step 5:** Tap a partial row → edit blanks only  
→ Already filled fields are grey / locked.

**Step 6:** Check top **Dispatch Delivery Status**  
→ e.g. 20000 Main ÷ 580 ≈ 34.48 wagons.

---

## Act 4: Transfer Entry + Consignment Effect (Feedback 21)

*Goal: Transfer on behalf of another mill; confirm → GP In + GP Out (T) on recipient; consignment by recipient only.*

**Where to go:** **Gate Pass → Create** (Transfer toggle)  
+ **Gate Pass → Transfer Entry Management**

### What we fixed
1. Section renamed **Transfer Entry Management**
2. Transfer option inside GP Create UI
3. **Recipient Mill** = plant dropdown (Party on whose behalf)
4. **Delivery At** = supplier / depo where goods go
5. GP series chronological with **`(T)`** suffix (e.g. `501 (T)`)
6. Dispatch mill GP report: Party = Recipient Mill · Note = Delivery At
7. Intimation to recipient mill (+ admin) with GP details
8. Recipient **Confirm** (fingerprint) → atomic:
   - GP **In** `(T)` · Party = Actual Dispatch Mill · inventory +
   - GP **Out** `(T)` · Party = Delivery At · inventory − (nil effect)
9. Ticket closes on confirm
10. Notification on recipient dashboard
11. Admin escalate if unclosed **> 48h / 2 days**
12. Admin mill-wise table: Firm · Note · Status + filters on **each heading** (GP, Truck, Items, Supervisor…)
13. Dispatch mill shows **only** original `(T)`; recipient shows **In + Out**
14. Supervisor sign: creator + acceptor
15. Consignment slip: **only Recipient Mill** on receive/confirm date (popup after confirm)
16. Actual Dispatch Mill blocked from consignment on transfer GPs

### How to verify
**Step 1:** On **Beas** (dispatch mill) → Create **OUTWARD** → enable **Transfer Entry**  
→ Recipient Mill = **Rajoa** · Delivery At = e.g. Gurdaspur Depo → Generate  
→ GP looks like `…(T)`.

**Step 2:** Beas → Report Summary  
→ Party = Rajoa · Note = Gurdaspur Depo.

**Step 3:** Switch plant / login to **Rajoa** → notifications show transfer ticket  
→ **Transfer Entry Management** → **Confirm** + Scan fingerprint.

**Step 4:** After confirm  
→ Two auto GPs: In `(T)` (Party = Beas) + Out `(T)` (Party = Delivery At)  
→ Consignment Dispatch popup opens for recipient.

**Step 5:** Beas Transfer / GP list  
→ Only original `501 (T)` · no fake consignment from Beas.

**Step 6:** Admin → Transfer Entry Management  
→ Filter Firm / GP / Truck / Recipient / Delivery / Items / Status / Note  
→ Pending vs Closed visible.

---

## 30-second cheat sheet (all 4)

| Feedback | Tab | Look for |
|----------|-----|----------|
| **03** Benchmarks | Yield → Mill Yield Benchmarks | DB rows, Round Fig edit, Save Targets 71/66.2, trash |
| **17** Rice/Paddy | Yield → Yield from Rice / Paddy | Daily default, Diff, Format 1 multi-page, Format 2 datesheet, admin export only |
| **19** Consignment | Yield → Consignment (4th) + after Finalize | Popup, Depo Details, wagons÷580, locked tap-fill, nil hidden |
| **21** Transfer | GP Create Transfer + Transfer Entry Mgmt | `(T)`, Confirm → In+Out, recipient consignment, heading filters |

---

### Demo order (~25 min)
1. Prisma generate + db push + restart API  
2. **F03** edit Round Fig → check Yield Diff  
3. **F17** Daily rice → Format 2 one mill (admin)  
4. **F21** Transfer OUT `(T)` on Beas → Confirm on Rajoa → see In+Out + consignment popup  
5. **F19** Finalize GP report → consignment modal → one entry + check wagons banner  
6. Supervisor: Dashboard → Consignment card · tap partial row (locked fields)

---

### Note
- **Mill Yield Benchmarks** = Feedback **03** master settings (not the mill-wise report).
- **Mill-wise Goyal/Beas/Rajoa table** = **Yield from Rice** / **Yield from Paddy** (Feedback 17).
- Inventory on transfer confirm: In then Out = **nil** stock effect on recipient for that move.  
- Consignment for transfers is **recipient-only**, on receive/confirm date.  
- Nil consignment day still needs fingerprint but does **not** appear in the report list.

### Re-audit fixes (Sep 8 — wrong / missing closed)
| Issue | Fix |
|-------|-----|
| Compare targets hardcoded 71/66.2 | Load `TARGETS` row from DB |
| Paddy period locked weekly only | Weekly default; monthly / till date / range viewable |
| Format 2 export not API-gated | `?export=1` requires SUPER_ADMIN |
| Post-finalize always showed GP reminder | Reminder only when GP report not ready |
| `extraGatePassIds` missing from migration | New migration `20260908150000_…` |
| Transfer confirm could change recipient | Recipient locked; confirm only from recipient plant |
| Transfer Mgmt showed In+Out on dispatch mill | Dispatch = original `(T)` only; recipient = In+Out |
| Transfer consignment any date | Must match receive/confirm date |

### Sign-off
| Feedback | Points | Status |
|----------|--------|--------|
| 03 Mill Yield Benchmarks | Yield Mgmt tab · DB list + edit + targets + Compare | Done |
| 17 Yield Rice / Paddy | All sections, formulas, Format 1/2, export lock, intermill | Done |
| 19 Consignment Dispatch | 4th tab, popup, protocol, nil, wagons, reminders, lock fill | Done |
| 21 Transfer Entry | `(T)`, confirm In/Out, filters, recipient consignment | Done |
