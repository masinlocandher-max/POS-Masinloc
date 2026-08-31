# Masinloc POS

Mobile-first restaurant commerce app for Masinloc, Zambales.

Version 1 focuses on one reliable transaction loop:

**Scan → Order for [Name] → Dine In / Pick Up / Delivery → Menu → Pay → Verify → Kitchen → Ready → Complete → Loyalty**

## Status

Private staging candidate. The live-data POS and the static-hosting hardening
now share one code line, but the app is **not open to the public yet**. A
staging access code gates published builds, the page is `noindex`, and nothing
publishes on a push.

To put it in the team's hands, an admin needs to enable GitHub Pages and add
the `STAGING_ACCESS_CODE` secret, then run the **Deploy staging** workflow.
Steps in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#deploying-staging).

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check, build, and run the 404 guards
npm run preview  # serve dist/ the way a host would
```

## Product principles

- Restaurant-first.
- Customer does not need an account.
- Customer ordering is mobile web/PWA first.
- Business app is mobile-first and touch-friendly.
- Digital payment is verified before the order is released to the kitchen.
- Cash can be confirmed by cashier before release to kitchen.
- Delivery is optional and available only when the store enables its own rider/service.
- Marketplace discovery remains separate, while an approved merchant can maintain the public profile consumed by Masinloc Connect.
- Core software is free for the initial launch.

## V1 modules

1. Guest ordering
2. Payment verification
3. Order queue
4. POS
5. Kitchen display
6. Order chat
7. Loyalty
8. Inventory and catalog controls
9. Expenses, cash reconciliation, attendance and audit trail
10. Marketplace profile and merchant settings

## Deferred

- Full Marketplace ordering integration
- Payment gateway APIs
- Full inventory/procurement
- Hotel PMS
- Delivery rider app/live tracking
- Advanced CRM
- Accounting integrations
- Official fiscal invoicing/BIR accreditation layer

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — module boundaries and domain model
- [docs/REGISTRATION_AND_ACCESS.md](docs/REGISTRATION_AND_ACCESS.md) — merchant eligibility and approval
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — deployment, the 404 post-mortem, and the no-public-access posture
