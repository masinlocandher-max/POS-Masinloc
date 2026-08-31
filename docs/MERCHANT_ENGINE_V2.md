# Masinloc POS Merchant Engine V2

## Objective

Evolve the existing restaurant-first prototype into a generic Philippine merchant operating system while preserving its strongest existing QR ordering, payment verification, kitchen, chat, loyalty and offline-first flows.

This is a clean-room implementation based on publicly observable POS workflows and common merchant requirements. Do not copy third-party source code, private APIs, branding, copyrighted assets, or proprietary documentation.

## Operating modes

### Food Service
- visual menu/catalog
- dine-in / pickup / merchant-owned delivery
- modifiers and notes
- payment verification
- kitchen ticket workflow
- order status
- order slips and receipts

### Retail
- barcode-first checkout
- compact product search
- editable quantity
- controlled editable unit price
- discounts
- fast payment
- receipt printing
- inventory decrement on completed sale

### Hybrid
For bakeries, cafés with merchandise, salons with retail products, repair shops with parts, and other mixed businesses.

## Merchant verticals

Initial presets should support sari-sari stores, groceries, mini marts, cafés, restaurants, bakeries, food kiosks, pharmacies as inventory retail only unless regulatory requirements are implemented, hardware stores, clothing, beauty, salons, repair/parts sellers, home sellers, market retailers and specialty retail.

Presets configure defaults. They must not create separate product engines.

## Core domain

- Merchant
- Outlet
- Staff
- Role
- Product
- Category
- ModifierGroup
- Modifier
- Supplier
- Customer
- Order
- OrderItem
- Payment
- Expense
- BusinessDay
- InventoryMovement
- PurchaseOrder
- StockTransfer
- PrinterProfile
- AuditEvent

## Business day model

A merchant opens a business day before operational trading. Record:

- opened at / opened by
- opening cash
- total orders
- gross sales
- discounts
- refunds
- net sales
- cash sales
- non-cash sales
- expenses
- expected closing cash
- actual closing cash
- cash over / short
- closed at / closed by

This should be distinct from simply grouping orders by calendar date.

## Inventory

Inventory is event-based. Never mutate stock without writing an inventory movement.

Movement reasons:
- sale
- restock
- return
- damaged
- expired
- lost
- personal use
- count correction
- transfer in
- transfer out
- other

Required reports:
- current stock
- low-stock list
- inventory history
- inventory adjustments
- inventory valuation
- average daily usage
- average weekly usage
- days of stock remaining
- replenishment forecast

## Expenses

Record amount, category, outlet, date/time, optional supplier, optional note, and later optional receipt attachment.

Expenses must feed profitability reporting.

## Financial reporting

At minimum:

Gross sales
- discounts
- refunds
= net sales

Net sales
- cost of goods sold
= gross profit

Gross profit
- operating expenses
= estimated operating profit

Keep tax/accounting claims clearly separate unless a compliant accounting module is implemented.

## Hardware layer

Design adapters rather than hard-code device logic into checkout.

Targets:
- camera or hardware barcode scanner
- Bluetooth thermal printers
- USB thermal printers where browser/platform support permits
- 80 mm receipts
- multiple printer profiles
- built-in Android POS terminal printers later

Printer profiles should support receipt printer vs kitchen/order-slip printer.

## Plans

### Free
- ₱0
- one location
- up to 3 staff
- up to 100 products initially
- POS
- QR ordering
- basic inventory
- expenses
- customers
- basic loyalty
- kitchen workflow
- basic reports

### Pro
- ₱249/month initially
- ₱1,990/year initially
- one location
- up to 10 staff
- up to 1,000 products
- barcode scanning
- thermal printing
- multiple printers
- inventory history and adjustments
- low-stock alerts
- suppliers
- staff accounts
- discount controls
- advanced reports
- exports

### Business+
- ₱399/month
- ₱2,990/year
- multi-branch
- unlimited staff/products subject to fair-use policy later
- purchase orders
- role permissions
- stock transfers
- inventory valuation
- usage forecasting
- advanced profitability
- audit log
- priority support

Pricing and limits are product configuration and may change without schema rewrites.

## Training center

The product should eventually contain an in-app Learn section. Training content should be authored against our own UI and workflows.

Modules:

1. Getting started
   - create business
   - choose business type
   - configure outlet
   - add products
   - configure inventory
   - configure payments
   - configure printer
   - open first business day

2. POS basics
   - new sale
   - search item
   - barcode scan
   - quantity
   - controlled price edit
   - discount
   - payment
   - receipt
   - reprint
   - void / refund

3. Food service
   - dine-in / pickup / delivery
   - modifiers
   - kitchen tickets
   - order slips
   - order status

4. Inventory
   - receive stock
   - adjust stock
   - inventory history
   - valuation
   - usage
   - forecasting
   - transfer stock

5. Expenses
   - record expense
   - categories
   - supplier expense

6. Reports
   - sales
   - payment methods
   - products
   - inventory
   - expenses
   - profitability
   - business-day close

7. Hardware
   - barcode scanner
   - Bluetooth printer
   - USB printer
   - 80 mm paper
   - troubleshooting

8. Administration
   - staff
   - roles
   - locations
   - registers
   - receipt settings
   - export

## Implementation order

1. Generalize domain model without breaking current restaurant features.
2. Add plan/capability registry.
3. Add products, stock and inventory movement ledger.
4. Add expenses.
5. Add business-day open/close model.
6. Add retail POS mode and barcode input.
7. Add reporting calculations.
8. Add printer abstraction.
9. Add supplier and purchasing flows.
10. Add multi-location and role controls.
11. Add training center.
12. Integrate production PostgreSQL backend with server-enforced authorization and auditable transactional writes.

## Non-negotiable engineering rules

- Existing QR ordering and kitchen flow must keep working.
- Product logic must not be tied to Masinloc even if Masinloc is the initial market.
- Marketplace remains an integration layer, not a second catalog/order database.
- All sensitive capability enforcement must ultimately be server-side.
- Stock mutations must be auditable.
- Payment confirmation and refunds must be auditable.
- Offline behavior must fail visibly and reconcile safely.
- Reliability outranks feature count.
