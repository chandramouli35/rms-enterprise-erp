# Implementation Plan: Production Report Checklist (Points 2-5)

This plan outlines the steps to fully implement points 2 to 5 from the requested checklist.

## Open Questions
> [!WARNING]
> Please confirm the following before we proceed:
> 1. **Biometric for Final Output:** Does the "final output entry" refer to the "Create Batch" form submission in the Production Management page? Should the biometric verification happen when clicking "Create Batch"?
> 2. **Admin Dashboard:** For the "combined view of both Analysis reports & Production-wise reports", would you like a new data table in the Admin Dashboard that lists recent batches alongside their latest analysis data (e.g. Yield, Yield Target, Paddy Moisture, Final Broken)?

## Proposed Changes

---

### Backend Schema Updates

#### [MODIFY] `schema.prisma`
- Add `biometricData String?` to the `BatchAnalysis` model.
- Add `finalOutputBiometricData String?` to the `ProductionBatch` model (if required for final outputs).

#### [MODIFY] `production.service.ts` & `production.controller.ts`
- Update the batch analysis endpoints to accept and save `biometricData`.
- Enforce that a batch can have a maximum of 4 `BatchAnalysis` entries.
- Implement the validation for `Difference 01-04` (>11%) and `Final rice %` (> 2% of parnala broken) if these checks need to be logged or throw specific alerts (currently will just be handled via frontend warnings and dashboard alerts).

---

### Frontend Production Management Updates

#### [MODIFY] `frontend/src/pages/ProductionManagement.tsx`

**Point 2 & 5: Batch Analysis Layout and Visibility**
- Wrap the entire "Batch Analysis Container" in a condition to hide it when `productionType === 'Inter mill processing'`.
- Redesign the Batch Analysis section from a vertical form into a **horizontal table**.
- The table will have columns: `Date`, `Paddy mc`, `Khnjan broken`, `Polisher 01`, `Polisher 02`, `Polisher 03`, `Polisher 04`, `Difference 01-04`, `Parnala Broken`, `Final Broken`, `Rice moisture`, `Damage %`, `Discolour %`, `Frk %`, `Supervisor (Biometric)`.
- Allow adding up to 4 rows (entries) per selected batch.
- Add inline visual flags (Warnings) if `Difference 1-4` > 11% or if `Final Rice %` > (2% of Parnala Broken).

**Point 3: Biometric Integration**
- Integrate `biometricService.captureFingerprint()` for each Batch Analysis entry. When a user clicks "Save Entry" in the table, prompt for biometric thumbprint before submitting.
- Integrate `biometricService.captureFingerprint()` on the main "Create Batch" (Final Output) submission button.

---

### Admin Dashboard Updates

#### [MODIFY] `frontend/src/pages/Dashboard.tsx`
- Add a new section/table displaying a combined view of Production and Analysis reports.
- Ensure the flags for >11% difference and >2% final rice ratio are visibly surfaced to the Admin/Supervisor in this view.

## Verification Plan
### Automated/Manual Testing
- Start the development server and verify the UI changes on the Production Management page.
- Test creating a batch (requires mock biometric).
- Test adding multiple analysis entries to a batch (up to 4) and verify horizontal table layout.
- Test the 11% and 2% alert flags.
- Verify the Admin Dashboard displays the new combined view.
- Verify Batch Analysis is hidden when Intermill processing is selected.
