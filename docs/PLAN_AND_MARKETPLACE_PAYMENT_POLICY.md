# POS Plan and Marketplace Payment Policy

## Price editing

- Free: no transaction-level price override. Checkout uses the saved catalog price.
- Pro: owner and manager may override a line item's selling price for a specific transaction.
- Business+: same controlled override, with auditability expected across larger teams and branches.
- Cashiers must not receive unrestricted price editing rights.
- Price override is different from a discount: an override replaces the transaction price, while a discount preserves the original price and records the reduction separately.
- Server-side authorization is required. The browser must never be the authority for price overrides or discounts.

## Plan pricing

- Free: PHP 0
- Pro: PHP 249/month or PHP 1,990/year
- Business+: PHP 399/month or PHP 2,990/year

## Marketplace payment policy

### Launch model: merchant-direct payments

The Marketplace should not hold merchant funds for the launch version.

1. Customer orders from a merchant's Marketplace storefront.
2. Customer chooses one of the merchant's enabled payment methods.
3. Cash orders are paid directly to the merchant on pickup/delivery/counter settlement.
4. Digital payments use the merchant's configured GCash/Maya/QR Ph or other supported payment destination/QR.
5. The customer enters the payment reference after payment.
6. The Marketplace order enters payment review.
7. The merchant verifies payment before fulfillment proceeds.
8. The order, payment state, Marketplace source, and inventory movement remain in the shared POS backend.

Money therefore goes directly from customer to merchant. The Marketplace does not become the custodian of seller funds in this launch flow.

### Future embedded-payments model

A platform payment provider may later replace manual merchant verification. The preferred architecture is merchant/sub-account onboarding, hosted or provider-secured checkout, webhook-confirmed payment, automatic reconciliation, optional platform fee, and direct/automated merchant settlement.

Potential PH platform-payment providers include PayMongo Platforms and Xendit xenPlatform. Provider credentials, KYC/onboarding requirements, commercial terms, and regulatory/compliance review are required before enabling automatic collection or split payouts.

### Marketplace principles

- Marketplace selling remains available across Free, Pro, and Business+.
- POS and Marketplace share the same catalog, inventory source of truth, and orders domain.
- A Marketplace order must only contain products explicitly published by the merchant.
- Marketplace payment status must be server-authoritative.
- Never mark a digital order paid merely because the customer says they paid.
- Platform fees, if introduced later, must be explicit and recorded separately from merchant sales.
- Do not store raw card credentials in the POS or Marketplace.
