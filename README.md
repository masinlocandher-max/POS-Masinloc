# Masinloc POS

Mobile-first restaurant commerce app for Masinloc, Zambales.

Version 1 focuses on one reliable transaction loop:

**Scan → Order for [Name] → Dine In / Pick Up / Delivery → Menu → Pay → Verify → Kitchen → Ready → Complete → Loyalty**

## Status

Private staging. The app builds and deploys, but it is **not open to the public
yet** — a staging access code gates the whole build and nothing publishes on a
push. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

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
- Marketplace integration with Masinloc Connect is intentionally deferred. The app is built standalone first with clean integration boundaries.
- Core software is free for the initial launch.

## V1 modules

1. Guest ordering
2. Payment verification
3. Order queue
4. POS
5. Kitchen display
6. Order chat
7. Loyalty
8. Store-owned delivery settings
9. Basic reporting
10. Merchant settings

## Deferred

- Masinloc Connect Marketplace integration
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
