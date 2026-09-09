# Feedbacks 28–31 — Leftover gap closure (2026-09-09)

Source audit vs PDFs. Functional feature checklist was already largely implemented; remaining gaps closed:

## Closed this pass

1. **Draft GP quota bypass** — `completeGatePass` re-runs `assertSodaAssignable` before flipping draft → live (F28/F29).
2. **Finance submodule RBAC (API)** — routes require submodule (Deals/Sale/Purchase/Junction/AR/AP/Payments); dynamic Sale/Purchase via `assertFinanceSub`.
3. **Finance tab URL bypass** — `FinanceManagement` redirects if `?tab=` lacks submodule `canView`.
4. **Add Soda / Payment create UI** — gated on Finance submodule `canAdd`; Sale/Purchase edit + ledger sync gated on `canEdit`.

## Still intentional (PDF soft / next-gen)

- **WebSocket** for Sale/Purchase live sync → **8s poll** (F29 walkthrough). PDF asks for real-time/trigger sync; poll + server-side sync on GP create/complete/update covers correctness; full WS is enhancement, not missing business logic.

## Verify

```powershell
cd backend
npm run start:dev
# optional
node migrate_permissions.js
```

Re-login after permission changes. Walk each FEEDBACK_28–31 checklist.
