# Masinloc POS — V1 Architecture

## Product scope

Restaurant-first, mobile-first commerce application for Masinloc businesses.

The app is standalone in V1. Masinloc Connect Marketplace integration comes later and must reuse the same merchant, catalog, fulfillment, order and loyalty domains rather than duplicating them.

## Primary customer journey

General QR / Marketplace entry later:

`Order for [Name] → Dine In / Pick Up / Delivery → Menu → Cart → Payment → Confirm Order → Track → Chat`

Table QR entry:

`Order for [Name] → Menu → Cart → Payment → Confirm Order → Track → Chat`

The table context is embedded in the QR, so the customer should not be asked to select a table again.

### Delivery rule

Delivery is visible only when the merchant enables delivery and operates its own rider/service. V1 does not dispatch third-party riders.

## Payment-first rule

Self-service orders must not be released to the kitchen until payment is confirmed.

Digital V1:

`Checkout → merchant QR → customer pays merchant directly → customer submits confirmation/reference → PAYMENT_REVIEW → cashier verifies → PAID → kitchen`

Cash V1:

`Checkout → payment number → customer pays cashier → cashier confirms → PAID → kitchen`

No payment API is required in V1. The platform does not hold merchant funds.

## Order state machine

- `AWAITING_PAYMENT`
- `PAYMENT_REVIEW`
- `PAID`
- `PREPARING`
- `READY`
- `OUT_FOR_DELIVERY` (delivery only)
- `COMPLETED`
- Future: `CANCELLED`, `REFUNDED`

Kitchen views only orders that have passed payment verification.

## Business application

Primary mobile navigation:

1. Home
2. Orders
3. POS
4. Customers
5. More

### Home

- Sales today
- Orders today
- Orders needing attention
- Quick New Sale
- Kitchen shortcut
- QR shortcut
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

### Customers

Lightweight guest loyalty records. Customer purchase does not require account registration.

Initial loyalty rule:

`₱10 spent = 1 point`

### More

- Menu & availability
- QR codes & tables
- Pickup & delivery
- Payment methods
- Loyalty rewards
- Staff & roles
- Reports
- Business settings

## Customer identity

No customer account is required.

Required at start:

- `Order for [Name]`

Optional after checkout/completion:

- mobile number for loyalty/reward recovery

Later, OTP can secure reward recovery without introducing passwords or traditional registration.

## Merchant model

V1 supports one merchant/business location per free account.

Conceptual entities:

- Merchant
- Outlet
- Staff
- Role
- MenuCategory
- MenuItem
- ModifierGroup
- Modifier
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
- Shift
- AuditEvent

## Store-owned delivery

Merchant settings control:

- enabled / disabled
- delivery areas
- delivery fee
- minimum order
- operating hours
- estimated delivery time
- optional internal rider name

V1 status flow:

`PAID → PREPARING → READY → OUT_FOR_DELIVERY → COMPLETED`

No rider app and no live GPS in V1.

## Marketplace integration boundary

Do not build Marketplace coupling into the restaurant app now.

Later, Masinloc Connect Marketplace should consume or deep-link into the same ordering service.

Marketplace will act as **discovery**.
Masinloc POS will remain **transaction + operations + retention**.

Future flow:

`Masinloc Connect Marketplace → merchant listing → Order Now → Masinloc POS ordering session`

The integration should pass:

- merchant ID
- optional campaign/referrer
- fulfillment eligibility
- optional customer session

It must NOT maintain a second menu, second order table, second customer record, or second loyalty balance.

## Free V1

- 1 business/location
- up to 3 staff
- unlimited customer orders
- unlimited customers
- QR ordering
- POS
- kitchen workflow
- order chat
- dine-in
- pickup
- merchant-owned delivery
- basic loyalty
- basic sales reporting

No paid plan is required in the first product iteration. Usage and operational fit come first.

## Backend implementation target

The current repository begins with a frontend/product architecture prototype. Production backend should use PostgreSQL with server-enforced merchant/role authorization, realtime order/status/chat subscriptions, audit logging for payment confirmation and sensitive actions, and idempotent transaction writes.

Recommended domain separation:

- `identity`
- `merchant`
- `catalog`
- `ordering`
- `payments`
- `kitchen`
- `chat`
- `customers`
- `loyalty`
- `reporting`
- `integrations`

Marketplace-specific code belongs only in `integrations/masinloc-connect` when that phase starts.
