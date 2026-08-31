# POS → Marketplace Selling

## Goal

A merchant should be able to use Masinloc POS as the single source of truth for products, prices, stock and orders, then optionally sell selected products directly on Marketplace without maintaining a second catalog.

## Merchant setting

Add a Settings area:

`Settings → Marketplace`

Primary control:

**Sell on Marketplace**

When OFF:
- POS remains private to the merchant.
- No product is publicly listed.
- Marketplace does not create orders for the merchant.

When ON:
- merchant can make the storefront visible
- merchant chooses which products are published
- Marketplace reads the same product/catalog records used by POS
- Marketplace orders enter the same order system used by POS
- inventory is reduced from the same stock ledger
- reporting includes both POS and Marketplace sales while retaining channel attribution

## Settings

- Sell on Marketplace: on/off
- Storefront visible: on/off
- Auto-publish new products: on/off
- Hide out-of-stock items: on/off
- Marketplace price: same as POS / custom per product
- Stock availability: live inventory / manual availability
- Pickup available: on/off
- Delivery available: on/off
- Minimum order: optional
- Order lead time: optional

Safe defaults:
- Marketplace selling OFF
- Storefront hidden
- Auto-publish OFF
- Hide out-of-stock ON
- Same price as POS
- Live inventory ON
- Pickup ON
- Delivery OFF

This prevents accidental publication of a merchant's entire private catalog.

## Product-level setting

Each product should expose:

- Publish to Marketplace: on/off
- Marketplace title override: optional
- Marketplace description: optional
- Marketplace image: optional
- Marketplace price override: optional when custom pricing is selected

Core SKU, barcode, cost, and internal inventory metadata should not be publicly exposed unless required.

## Inventory rule

There is only one inventory ledger.

Example:

Stock on hand = 10

Marketplace customer buys 2
→ Marketplace order enters POS ordering service
→ payment/order rules complete
→ inventory movement `sale = -2`
→ stock on hand becomes 8
→ POS immediately sees 8
→ Marketplace immediately sees 8

A walk-in POS sale must update Marketplace availability in exactly the same way.

Never maintain a separate Marketplace stock number.

## Order channel

Orders need explicit source attribution:

- `pos`
- `qr_ordering`
- `marketplace`

Marketplace must not maintain its own order table. It creates an order in the shared ordering domain with `source = marketplace` and optional campaign/referrer metadata.

This allows reporting such as:

- POS sales
- QR sales
- Marketplace sales
- total sales across all channels

## Food-service Marketplace behavior

A restaurant/café may publish menu products to Marketplace.

Marketplace checkout can use:
- Pickup
- Merchant-owned Delivery

Dine-in remains an in-store/QR behavior unless explicitly designed otherwise.

Paid Marketplace food orders follow the same kitchen flow:

`Marketplace → order → payment confirmation → PAID → PREPARING → READY → pickup/delivery → COMPLETED`

## Retail Marketplace behavior

Retail products use the same SKU and inventory data as POS.

Marketplace purchase:

`Marketplace product → cart → fulfillment/payment → shared order → inventory movement → receipt/order record`

Out-of-stock products can automatically disappear or show unavailable based on merchant settings.

## Marketplace storefront

Marketplace is a discovery and ordering surface. POS remains the merchant operating system.

Public storefront may display:
- merchant name
- logo/cover
- store description
- categories
- published products
- selling price
- stock availability indicator
- pickup/delivery options
- business hours

It must not expose:
- product cost
- profit margin
- supplier data
- internal stock adjustments
- staff data
- private notes
- audit logs

## Plan rule

Direct Marketplace selling is available on Free, Pro and Business+ because Marketplace participation increases ecosystem liquidity and merchant adoption.

Paid tiers monetize operational depth rather than charging merchants merely to appear in Marketplace.

## Backend contract

Marketplace must consume shared services rather than copy data:

- catalog service
- inventory service
- ordering service
- payments/payment-verification service
- customer/loyalty service where applicable

Recommended integration interface:

`Marketplace → catalog projection → shared checkout → Order(source=marketplace) → inventory/payment/fulfillment`

Marketplace-specific presentation data can be stored as publication metadata attached to a product, but the canonical product and inventory records stay in POS.

## Permissions

Only authorized merchant roles may:
- enable Marketplace selling
- make the storefront public
- publish/unpublish products
- change Marketplace prices
- change fulfillment settings

These controls must ultimately be enforced server-side.
