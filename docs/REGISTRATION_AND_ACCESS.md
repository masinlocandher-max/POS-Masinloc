# Masinloc POS — Registration & Access

## Public route

Target production route:

`https://www.masinloc-zambales.com/posmasinloqueño`

The standalone app should be deployable under this subpath while remaining architecturally independent from Masinloc Connect Marketplace until the later integration phase.

## Eligibility

Masinloc POS V1 is a free community benefit for verified Masinloqueño-owned businesses operating in Masinloc, Zambales.

Customer ordering remains account-free. The eligibility gate applies to merchants/business operators who want access to the restaurant management application.

## Merchant registration

Initial registration collects:

- owner's full name
- business name
- business type
- barangay/locality in Masinloc
- complete business address
- Philippine mobile number
- verification document, such as a business permit, barangay certification, or another acceptable proof of a genuine Masinloc business
- confirmation that the applicant is Masinloqueño and the business operates in Masinloc

Registration does not immediately create an active merchant account.

## Why every application is reviewed

The UI must explain this before and after submission:

> Masinloc POS is a free local benefit reserved for verified Masinloqueño-owned businesses operating in Masinloc. Review helps keep the benefit local and prevents fake, duplicate, or out-of-area registrations.

Review is not a paid-plan gate. It is an eligibility and integrity control for the free community benefit.

## Approval lifecycle

Recommended states:

- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `APPROVED`
- `REJECTED`
- `SUSPENDED`

Only `APPROVED` merchants may access the operational merchant app.

A rejected applicant should receive a clear reason and be allowed to correct information and resubmit where appropriate.

## Admin review

Admin review should display:

- applicant identity
- business identity
- business type
- Masinloc locality/address
- mobile number
- submitted verification document
- duplicate-account indicators
- application history

Admin actions:

- approve
- reject with reason
- request correction/additional proof later
- suspend an already-approved merchant if eligibility or integrity issues are discovered

Every approval/rejection/suspension action must create an audit event recording the acting admin, timestamp, previous state, new state, and reason when applicable.

## Security requirement

The current frontend models the registration and review experience only. Production approval must be enforced by the backend.

Never rely on a hidden route, query parameter, local state, or disabled UI as authorization.

Production access rule:

`authenticated merchant user + approved merchant membership + server-authorized role -> operational app`

Admin endpoints and review screens must require an authorized platform-admin role on the server.

## Customer ordering remains frictionless

Restaurant customers do not need merchant registration or customer accounts.

Customer flow remains:

`Scan / Marketplace later -> Order for [Name] -> Dine In / Pick Up / Delivery -> Menu -> Payment -> Confirm -> Track -> Chat`

The Masinloqueño merchant verification gate must never add registration friction to the customer purchase journey.

## Marketplace integration later

Masinloc Connect Marketplace will later surface approved merchants only.

An approved merchant should eventually have one canonical merchant ID shared by:

- Masinloc POS
- Masinloc Connect Marketplace listing
- menu/catalog
- ordering
- customer history
- loyalty

Do not create a second merchant registration system inside Marketplace. Marketplace should consume the approved merchant record from the shared platform domain.
