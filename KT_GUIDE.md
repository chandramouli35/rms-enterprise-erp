# Rice Mill Management System (RMS) - Knowledge Transfer & Testing Guide

This document serves as a Knowledge Transfer (KT) guide to explain the core modules of the RMS, how they interact, and provides a step-by-step end-to-end testing flow.

## 📦 System Modules Overview

The system is designed to digitalize the end-to-end operations of a Rice Mill, from the moment a vehicle enters the premises to the final procurement and exit.

### 1. Authentication & Context Selection (`Login`)
* **What it does:** Handles secure access to the system. 
* **Key Features:** 
  * Validates credentials against the backend.
  * Context-aware: Standard users must select their specific Plant/Branch before logging in.
  * Super Admin flexibility: Super Admins can log in globally without selecting a plant and switch plants dynamically from the top navigation bar.

### 2. Dashboard (`Dashboard`)
* **What it does:** Provides a high-level overview of the mill's operations.
* **Key Features:** 
  * Displays metrics like active vehicles, today's procurement, and recent activities.
  * Data is filtered based on the active plant context (or shows global data for Super Admin).

### 3. Users & Roles (`UsersAndRoles`)
* **What it does:** Centralized access management.
* **Key Features:**
  * **Users:** Create and manage employee accounts, assign them to specific roles, and restrict them to specific plants.
  * **Roles & Permissions:** Define custom roles (e.g., Gate Keeper, Weighbridge Operator, Accountant) and configure a granular matrix of permissions (View, Add, Edit, Delete, Approve) for each module.
  * **Audit Logs:** Track user activities across the system.

### 4. Plants Management (`PlantsList`)
* **What it does:** Manages multiple physical locations or branches of the business.
* **Key Features:** 
  * Super Admins can add new plants, edit existing ones, and manage location details.
  * Forms the basis for multi-tenant data segregation (users only see data for their assigned plant).

### 5. Gate Pass (`GatePassManagement`)
* **What it does:** The entry and exit logging system for all vehicles.
* **Key Features:**
  * Creates an Inward Gate Pass when a truck arrives (capturing vehicle number, driver name, purpose, and material).
  * Generates a unique reference number that flows through the rest of the modules.
  * Closes the pass when the vehicle exits the premises.

### 6. Weighbridge (`WeighbridgeManagement`)
* **What it does:** Integrates with the physical weighbridge to record truck weights.
* **Key Features:**
  * **First Weight (Gross):** When a loaded truck enters, the operator selects the pending Gate Pass and records the gross weight.
  * **Second Weight (Tare):** After the truck unloads the paddy, it returns to the weighbridge to record the empty (tare) weight.
  * Automatically calculates the **Net Weight** (Gross - Tare).

### 7. Procurement (`ProcurementManagement`)
* **What it does:** Manages the actual purchasing and quality check of the raw material (Paddy).
* **Key Features:**
  * Links directly to the completed Weighbridge slips.
  * Captures quality parameters (e.g., moisture content, damage percentage).
  * Calculates final pricing based on the net weight and quality deductions.

---

## 🚀 End-to-End Testing Flow

To test the system thoroughly and see how data flows between modules, follow this sequence:

### Phase 1: Setup (Super Admin)
1. **Login:** Log in as a `SUPER_ADMIN`. Do *not* select a plant on the login screen.
2. **Verify Plants:** Go to the **Plants** module. Ensure at least one plant (e.g., "Main Plant HQ") exists.
3. **Configure Roles:** Go to **Users and Roles**. Create necessary roles if they don't exist:
   * `GATE_KEEPER` (Permissions: Add/View Gate Pass)
   * `WEIGHBRIDGE_OP` (Permissions: Add/View Weighbridge)
   * `PROCUREMENT_OFFICER` (Permissions: Add/View Procurement)
4. **Create Users:** Create dummy users for the roles above, assigning them all to the same Plant (e.g., "Main Plant HQ").

### Phase 2: Operations Flow (The Vehicle Journey)
For this phase, you can either log in as the specific dummy users you created, or use the Super Admin account (switching your context to "Main Plant HQ" using the top dropdown).

**Step 1: Vehicle Arrival (Gate Pass)**
* Navigate to **Gate Pass**.
* Click "New Inward Pass".
* Enter details (Vehicle No: `TEST-1234`, Material: `Paddy`, Driver: `John`).
* **Expected Result:** A new Gate Pass is created with status `PENDING` or `AT_WEIGHBRIDGE`.

**Step 2: First Weight (Weighbridge)**
* Navigate to **Weighbridge**.
* You should see the vehicle `TEST-1234` waiting for its first weight.
* Click to capture the weight (e.g., 25,000 kg Gross Weight).
* **Expected Result:** A weighbridge slip is generated, and the status moves to `AWAITING_UNLOAD` or `AWAITING_SECOND_WEIGHT`.

**Step 3: Quality Check & Purchase (Procurement)**
* Navigate to **Procurement**.
* Create a new procurement entry. Select the weighbridge slip for `TEST-1234`.
* Enter quality parameters (Moisture: 14%) and the agreed rate per quintal/ton.
* **Expected Result:** A procurement record is saved, pending the final net weight calculation.

**Step 4: Second Weight (Weighbridge)**
* Navigate back to **Weighbridge**.
* Select `TEST-1234` to capture the second weight (e.g., empty truck weight: 10,000 kg Tare Weight).
* **Expected Result:** The system calculates the Net Weight (15,000 kg). The associated Procurement record is automatically updated with the final weight and total cost.

**Step 5: Vehicle Departure (Gate Pass)**
* Navigate to **Gate Pass**.
* Find the pass for `TEST-1234` and mark it as `EXITED`.
* **Expected Result:** The operational cycle for this vehicle is complete.

### Phase 3: Verification
1. **Dashboard Check:** Go to the Dashboard. Verify that the total procurement volume and vehicle counts have updated accurately based on the transaction you just completed.
2. **Context Switching (Super Admin Only):** Use the top dropdown to switch to a different plant. 
   * **Expected Result:** The dashboard and tables should immediately update to show NO data (since you only processed the transaction in the HQ plant). Switch back to HQ to see the data again.
