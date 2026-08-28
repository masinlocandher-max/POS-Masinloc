import { posOrderEndpoint, supabasePublishableKey, supabaseUrl } from './supabase'
import type { Fulfillment, OrderStatus, PaymentMethod, PaymentStatus, PublicMenuCategory, PublicStorefront } from './posApi'

export type StorefrontPayload = {
  store: PublicStorefront & { payment_methods: Array<PublicStorefront['payment_methods'][number] & { qr_url?: string | null }> }
  menu: PublicMenuCategory[]
}

const storefrontEndpoint = `${supabaseUrl}/functions/v1/pos-storefront`

export async function loadStorefront(slug: string): Promise<StorefrontPayload> {
  const response = await fetch(`${storefrontEndpoint}?slug=${encodeURIComponent(slug)}`, { headers: { apikey: supabasePublishableKey } })
  const body = await response.json()
  if (!response.ok || !body.ok) throw new Error(body.error || 'Store unavailable')
  return { store: body.store, menu: body.menu || [] }
}

function guestClientId() {
  const key = 'masinloc-pos-guest-client-id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}

export async function submitGuestOrder(input: {
  slug: string
  source?: 'qr' | 'marketplace'
  fulfillment: Fulfillment
  customerName: string
  items: Array<{ product_id: string; quantity: number; note?: string; modifier_option_ids?: string[] }>
  paymentMethod: PaymentMethod
  tableLabel?: string
  customerPhone?: string
  deliveryAddress?: string
  deliveryLandmark?: string
  paymentReference?: string
  loyaltyOptIn?: boolean
}) {
  const response = await fetch(posOrderEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabasePublishableKey },
    body: JSON.stringify({ action: 'create', clientId: guestClientId(), idempotencyKey: crypto.randomUUID(), source: input.source || 'qr', ...input, website: '' }),
  })
  const body = await response.json()
  if (!response.ok || !body.ok) throw new Error(body.error || 'Order failed')
  return body.order as { order_id: string; order_number: number; tracking_token: string; total: number; status: OrderStatus; payment_status: PaymentStatus }
}

export async function loadGuestTracking(trackingToken: string) {
  const response = await fetch(`${posOrderEndpoint}?resource=track&token=${encodeURIComponent(trackingToken)}`, { headers: { apikey: supabasePublishableKey } })
  const body = await response.json()
  if (!response.ok || !body.ok) throw new Error(body.error || 'Could not load order')
  return body.order as { order_number: number; customer_name: string; fulfillment: Fulfillment; table_label: string | null; status: OrderStatus; payment_status: PaymentStatus; total: number; created_at: string; updated_at: string; messages: Array<{ sender_type: string; message: string; created_at: string }> }
}

export async function sendGuestChat(trackingToken: string, message: string) {
  const response = await fetch(posOrderEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabasePublishableKey },
    body: JSON.stringify({ action: 'chat', trackingToken, message, website: '' }),
  })
  const body = await response.json()
  if (!response.ok || !body.ok) throw new Error(body.error || 'Message failed')
}
