# Feedback Demo Script — All 5 Feedbacks

What we fixed + how to verify in tabs. Same style as `demo_script.md`.

**Covered:** Feedback **22** · **23** · **11** · **20** · **12**

---

## Act 1: Stock Health Report (Feedback 22)

*Goal: Plus/Minus wagons in consignments for Goyal / Beas / Rajoa.*

**Where to go:** Sidebar → **Yield Mgmt** → **Stock Health Report** (3rd tab)

### What we fixed
1. 3rd section under Yield Management
2. Default = Comparable (all mills + Total row)
3. Period: Till Date / Weekly / Monthly / Date Range
4. Mill selection (dropdown or tap firm name)
5. Columns A–G with formulas (backend)
6. C & D = consignments + bags in brackets
7. A = Total Work set by SUPER_ADMIN only (once; can edit later)
8. B = Delivered till yesterday (completed OUT only)
9. Alert when G &lt; −1 (e.g. −2, −3 — not −0.8)
10. Total row only in comparable / all-mills view

### How to verify
**Step 1:** Open **Yield Mgmt → Stock Health Report**  
→ Goyal, Beas, Rajoa + Total. Mill = Comparable.

**Step 2:** SUPER_ADMIN → pencil on **A · Total Work** → save e.g. `10`  
→ A updates; F and G recalculate.

**Step 3:** Check C / D / E / F / G  
→ C = paddy÷1154 · D = rice÷580 · E = C+D · F = A−B · G = B+E−A  
→ C/D show big consignments + small `(bags)`.

**Step 4:** Switch Weekly / Monthly / Date Range  
→ B window changes; never counts today as “till yesterday”.

**Step 5:** Tap firm **Beas**  
→ Single mill; Total hides. Use “Comparable view” to reset.

---

## Act 2: Product Creation Update (Feedback 23)

*Goal: Quantity format on products; inventory + GP follow that unit; no Type field.*

**Where to go:** Sidebar → **Products** (Product Master)

### What we fixed

**1. Quantity Format Options**
- Quantity Format on Add/Edit Product
- Standard units: **Nos** (Number) · **Bags** · **Kg** (Kilogram) · **Qtl** (Quintal) · **Ltr** (Liter)
- Admin can **+ Add New Unit** anytime
- GP auto-maps unit from product (e.g. Rubber Roll → **Nos**)

**2. Inventory & Display**
- Product stock kept in that format
- Note like: **“The data is in Nos.”**
- Wherever product is selected → show configured unit

**3. Type Cleanup**
- **Type** field removed from Product create/edit

### How to verify
**Step 1:** **Products → Add Product**  
→ No Type field.  
→ Quantity Format = e.g. **Nos — Number**. Name = Rubber Roll → Save.

**Step 2:** List row for Rubber Roll  
→ Shows Nos + “The data is in Nos.”

**Step 3:** **Inventory** (Consumables / product stock)  
→ Rubber Roll unit = Nos · note “The data is in Nos.”

**Step 4:** **Gate Pass → Create** → add item Rubber Roll  
→ Unit auto = **Nos** (hint under Unit). Count shows in Nos in front of name.

**Step 5 (optional):** **+ Add New Unit** e.g. TON → appears in Quantity Format dropdown.

---

## Act 3: Create Gate Pass (Feedback 11 + 20)

*Goal: Create IN/OUT the way client asked — chronology, WB, bags, fingerprint close.*

**Where to go:** Sidebar → **Gate Pass** → **Create Gate Pass**

### What we fixed (Feedback 11)
1. Default = supervisor mill (no plant dropdown)
2. Manual GP No + chronology (next sequence hint)
3. Auto punch Start Date/Time (read-only)
4. Auto punch Complete Date/Time on Close
5. Complete Date **N/A** option
6. Vehicle / Party / Driver dropdowns
7. RST manual + chronology hint
8. Soda No manual
9. Weighbridge **Yes** → Gross + Tare (+ Net + Net at Party) · **No** → hidden
10. Multi items · unit dropdown · count **in front** of item name
11. Empty + Loaded video times
12. Close with fingerprint · saved/draft **cannot edit**
13. IN → inventory + · OUT → inventory − (on Close)

### What we fixed (Feedback 20)
1. OUT: **Main Bags** + **Shortage Bags** + **Total Bags** (auto sum)
2. Report qty format `500 + 5 = 505`
3. Inventory uses **total bags** (Main + Shortage)

### How to verify
**Step 1:** Create → **INWARD**  
→ No plant select. Start Date/Time locked. Next GP/RST hints visible.

**Step 2:** Vehicle, Party, Driver from dropdowns · add product item  
→ `(qty) Name` in front. Unit from product (or Bags/Quintal). Add Item for 2nd line.

**Step 3:** Weighbridge **Yes** → Gross + Tare + Net at Party. **No** → section gone.

**Step 4:** Generate → Active list → **Close** (fingerprint + name)  
→ Inventory **up** for IN.

**Step 5:** Create **OUTWARD** → Main `500` · Shortage `5` · Total `505` → Close  
→ Inventory **down by 505**.

---

## Act 4: Gate Pass Report (Feedback 12)

*Goal: Daily report — Active/Completed, supervisor sign, print/export.*

**Where to go:** **Gate Pass → Report Summary**  
(or click blue **Active GP** box)

### What we fixed
1. 7 PM daily reminder (supervisors)
2. Completed report excludes Active (default Completed)
3. Finalize = fingerprint + who + submission time
4. Supervisor Sign column (who closed each GP)
5. Net mill + Net party · or **N/A** if WB was No
6. Quantity shows unit / `500 + 5 = 505 Bags`
7. Column order: S.No → Type → Empty → Loaded → GP → Truck → Party → Items → Qty → Net mill → Net party → Soda → Supervisor Sign → Note
8. Weight diff &gt; 0.50 Qtl → admin alert
9. Confirm digital matches manual → notification
10. Active GP box → list in report format (all Active In+Out)
11. 48h escalation → Admin + Supervisor
12. Mill chips + date From/To
13. Print + Export CSV

### How to verify
**Step 1:** Report → **Completed** vs **Active** toggles work.

**Step 2:** Click **Active GP** box → Active list, same columns.

**Step 3:** OUT row → `500 + 5 = 505 Bags` · Supervisor Sign filled · N/A if no WB.

**Step 4:** Mill chip + date range · Print / Export CSV.

**Step 5:** **Finalize Daily Report** → checkbox + Scan + name  
→ Banner shows who finalized and when.

---

## 30-second cheat sheet (all 5)

| Feedback | Tab | Look for |
|----------|-----|----------|
| **22** Stock Health | Yield → Stock Health (3rd) | A–G, comparable, tap firm, admin A |
| **23** Product | Products + Inventory + GP item | Nos/Bags/Kg/Qtl/Ltr, no Type, “data is in Nos”, GP auto unit |
| **11** GP Create | Gate Pass → Create | Mill default, chrono, WB, fingerprint Close |
| **20** Shortage | GP Create OUT + Report | Main+Shortage+Total, `500+5=505`, stock by total bags |
| **12** GP Report | Gate Pass → Report | Completed/Active, Supervisor Sign, Finalize, mill/date/print |

---

### Note
Inventory moves on **GP Close** (fingerprint), not on draft/save alone.

### Sign-off
| Feedback | Points | Status |
|----------|--------|--------|
| 22 Stock Health | All checklist | Done |
| 23 Product Creation | All + sub-points (units / inventory / Type removed) | Done |
| 11 Gate Pass Mgmt | All + WB Yes/No sub-points | Done |
| 20 GP Update (Shortage) | All 4 | Done |
| 12 GP Report | All 14 | Done |
