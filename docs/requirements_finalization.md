# Rice Mill Management System (RMS) - Requirements Finalization

## 1. Inbound Procurement Workflow
The procurement workflow governs the arrival, inspection, and recording of raw paddy or other inbound materials.

### Step 1.1: Gate Pass Generation
- **Actor**: Gate Security / Weighbridge Operator
- **Action**: When a vehicle arrives, a Gate Pass is created.
- **Data Captured**: 
  - Vehicle Number
  - Driver Name & License
  - Source (Farmer / Mandi / Vendor)
  - Estimated Weight / Bags
- **Output**: A unique Gate Pass ID is generated and printed/assigned.

### Step 1.2: Honeywell Weighbridge Sync (Gross Weight)
- **Actor**: Weighbridge Operator
- **Action**: Vehicle is weighed on the weighbridge.
- **Integration**: The system integrates with the Honeywell weighbridge indicator (via RS232/TCP) to automatically capture the Gross Weight. Manual override must be flagged and requires Plant Manager approval.
- **Data Captured**: Gross Weight (MT), Timestamp.

### Step 1.3: Quality Check (QC) Checklist
- **Actor**: Lab Technician / QC Manager
- **Action**: A sample is drawn from the vehicle.
- **Parameters Checked**:
  - Moisture Content (%)
  - Discoloration (%)
  - Broken Grains (%)
  - Foreign Matter (%)
- **Validation**: If parameters fall outside acceptable thresholds, the batch is either rejected or marked for a price deduction.
- **Output**: QC Status (Approved / Rejected / Accepted with Deduction).

### Step 1.4: Weighbridge Sync (Tare Weight) & Unloading
- **Actor**: Weighbridge Operator
- **Action**: After unloading, the empty vehicle is weighed.
- **Integration**: Auto-capture Tare Weight.
- **Calculation**: `Net Weight = Gross Weight - Tare Weight`.
- **Finalization**: Procurement Batch is created in Inventory, linked to the Gate Pass.

---

## 2. Production Yield Tracking
Tracking the transformation of raw paddy into finished rice involves multiple milling stages and complex yield calculations.

### Step 2.1: Batch Allocation
- **Actor**: Plant Manager / Miller
- **Action**: A specific Procurement Batch (or mixed batches) is allocated to a Production Run.
- **Data Captured**: Input Weight (Paddy).

### Step 2.2: Milling Process Calculations
- The milling process generates multiple outputs from the single input.
- **Outputs Tracked**:
  - Head Rice (Premium Output)
  - Broken Rice (Byproduct)
  - Bran (Byproduct)
  - Husk (Byproduct)

### Step 2.3: Process Loss Formulas
- Total Output = Sum of all outputs (Head + Broken + Bran + Husk).
- **Process Loss** = Input Weight - Total Output.
- **Yield Percentage** = (Head Rice / Input Weight) * 100.
- **Validation Rule**: If Process Loss > 3% (configurable threshold), an alert is sent to the Plant Manager for investigation (could indicate theft, extreme moisture loss, or machine inefficiency).

---

## 3. Dispatch & Ledger Rules
Managing outbound sales and inter-plant transfers.

### Step 3.1: Sales Order & Vehicle Allocation
- **Actor**: Dispatch Manager
- **Action**: Assign a vehicle to fulfill a Sales Order.
- **Multi-Plant Validation Rule**: A dispatch order can only be assigned to a plant if that plant has sufficient Finished Goods Inventory. Cross-plant dispatch requires an explicit "Inter-Plant Transfer" Gate Pass before fulfilling the Sales Order.

### Step 3.2: Outbound Weighbridge Sync
- **Actor**: Weighbridge Operator
- **Action**: Vehicle weighed empty (Tare) and full (Gross).
- **Calculation**: Net Weight dispatched.

### Step 3.3: Ledger Rules (Financials)
- **Actor**: Accountant / System (Automated)
- **Action**: Once dispatch is complete and the vehicle exits:
  - **Inventory Ledger**: Deduct exact dispatched weight.
  - **Financial Ledger**: Post Accounts Receivable based on `Net Weight * Agreed Price`.
- **Rule**: Ledger entries are immutable. Any corrections require a registered "Debit/Credit Note" authorized by Super Admin.
