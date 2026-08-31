# Masinloc POS — Merchant Engine Architecture

## Product scope

Mobile-first Philippine merchant operating system with two first-class operating modes: Food Service and Retail, plus a Hybrid mode for businesses that need both.

The existing restaurant and QR-ordering experience remains supported. The underlying product is no longer architecturally restaurant-only: catalog, inventory, sales, expenses, business days, reporting, staff, locations and hardware support are shared merchant domains.

Masinloc is the initial market and distribution context, not a hard-coded technical constraint.

## Operating modes

### Food Service

`Order for [Name] → Dine In / Pick Up / Delivery → Menu → Cart → Payment → Confirm Order → Track → Chat`

Table QR entry embeds table context so the customer is not asked to select a table again.

Staff POS supports a visual catalog, modifiers/notes, kitchen/order slips and order status.

### Retail

`Open business day → scan/search item → cart → quantity/controlled price edit → discount → payment → receipt → inventory movement`

Retail must optimize for speed and barcode use rather than force the food-service menu interaction.

### Hybrid

For cafés with merchandise, bakeries, salons selling products, repair shops selling parts and similar businesses. Hybrid uses the same product/order engine with both food-service and retail presentation rules.

## Payment-first rule for self-service food orders

Self-service orders must not be released to the kitchen until payment is confirmed.

Digital:

`Checkout → merchant QR → customer pays merchant directly → customer submits confirmation/reference → PAYMENT_REVIEW → cashier verifies → PAID → kitchen`

Cash:

`Checkout → payment number → customer pays cashier → cashier confirms → PAID → kitchen`

The platform does not hold merchant funds in the initial implementation.

## Order state machine

- `AWAITING_PAYMENT`
- `PAYMENT_REVIEW`
- `PAID`
- `PREPARING`
- `READY`
- `OUT_FOR_DELIVERY`
- `COMPLETED`
- Planned: `CANCELLED`, `REFUNDED`

Kitchen views only orders that have passed payment verification.

## Business application

Primary navigation remains simple:

1. Home
2. Orders
3. POS
4. Customers
5. More

Retail-heavy businesses may surface Inventory as a primary shortcut without changing the domain model.

### Home

- sales today
- orders today
- orders needing attention
- low-stock alerts where enabled
- business-day status
- quick New Sale
- Kitchen shortcut for food merchants
- QR shortcut where enabled
- Messages shortcut

### Orders

Operational queues:

- Payments
- Active
- Ready
- Completed

Each order owns its own chat thread so conversations cannot mix between customers.

### POS

Staff-created transactions for walk-ins and customers who do not scan QR.

Food Service uses a visual product grid and kitchen-aware flow.
Retail uses barcode/search-first flow and inventory-aware checkout.

### Customers

Lightweight guest loyalty records. Customer purchase does not require account registration.

Initial loyalty rule remains configurable, with `₱10 spent = 1 point` as the current default.

### More

- Products / Menu & availability
- Inventory
- Expenses
- QR codes & tables
- Pickup & delivery
- Payment methods
- Loyalty rewards
- Suppliers
- Staff & roles
- Reports
- Printers & hardware
- Business settings

## Customer identity

No customer account is required for purchase.

Optional mobile number can support loyalty/reward recovery. OTP may later secure reward recovery without introducing passwords for ordinary customers.

## Merchant model

Core entities:

- Merchant
- Outlet
- Staff
- Role
- Product
- ProductCategory
- ModifierGroup
- Modifier
- Supplier
- FulfillmentSetting
- Table / OrderingLocation
- PaymentMethodSetting
- Order
- OrderItem
- Payment
- KitchenTicket
- ChatThread
- ChatMessage
- Customer
- LoyaltyAccount
- LoyaltyTransaction
- Reward
- BusinessDay
- Expense
- InventoryMovement
- PurchaseOrder
- StockTransfer
- PrinterProfile
- AuditEvent

## Business-day model

A merchant should be able to explicitly open and close a business day rather than relying only on calendar-date queries.

Track:

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

## Inventory model

Inventory is event-based. Every stock change must create an auditable movement.

Reasons:

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

Reports should support current stock, low stock, history, adjustments, valuation, average usage and replenishment forecasting according to plan capability.

## Expenses and profitability

Expenses are first-class operational records and feed reporting.

Reporting model:

`Gross sales - discounts - refunds = net sales`

`Net sales - cost of goods sold = gross profit`

`Gross profit - operating expenses = estimated operating profit`

Tax/accounting claims remain separate unless a compliant accounting module is implemented.

## Store-owned delivery

Merchant settings control:

- enabled / disabled
- delivery areas
- delivery fee
- minimum order
- operating hours
- estimated delivery time
- optional internal rider name

Flow:

`PAID → PREPARING → READY → OUT_FOR_DELIVERY → COMPLETED`

No third-party dispatch dependency is required in the initial product.

## Hardware architecture

Hardware support must use adapters so checkout is not coupled to one device vendor.

Targets:

- camera or hardware barcode scanners
- Bluetooth thermal receipt printers
- USB thermal printers where platform support permits
- 80 mm receipt layouts
- multiple printer profiles
- dedicated receipt vs kitchen/order-slip printers
- built-in Android POS terminal printers later

## Plans

Plan definitions live in code and must be server-enforced once the production backend is connected.

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
- purchase orders
- role permissions
- stock transfers
- inventory valuation
- usage forecasting
- advanced profitability
- audit log
- priority support

Pricing and limits are configuration, not schema assumptions.

## Marketplace integration boundary

Masinloc Connect Marketplace remains discovery. Masinloc POS remains transaction + operations + retention.

Future flow:

`Masinloc Connect Marketplace → merchant listing → Order Now → Masinloc POS ordering session`

The integration may pass merchant ID, campaign/referrer, fulfillment eligibility and optional customer session. It must not maintain a second catalog, order table, customer record or loyalty balance.

## Backend implementation target

Production backend should use PostgreSQL with server-enforced merchant/role authorization, realtime order/status/chat subscriptions where useful, auditable payment/refund/inventory actions, and idempotent transaction writes.

Recommended domain separation:

- `identity`
- `merchant`
- `catalog`
- `inventory`
- `ordering`
- `payments`
- `expenses`
- `business-days`
- `kitchen`
- `chat`
- `customers`
- `loyalty`
- `reporting`
- `hardware`
- `billing`
- `integrations`

Marketplace-specific code belongs only in `integrations/masinloc-connect`.

## Training

Training content is part of the product, not an afterthought. An in-app Learn area should cover getting started, POS basics, food service, retail/barcode checkout, inventory, expenses, reports, hardware and administration using our own UI and workflows.
