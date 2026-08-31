import { posOrderEndpoint, supabase, supabasePublishableKey, supabaseUrl } from './supabase'
import type { Fulfillment, OrderStatus, PaymentMethod, PaymentStatus, PublicMenuCategory, PublicStorefront } from './posApi'

type PublicPaymentMethod = {
  id: string
  method: PaymentMethod
  label: string
  requires_manual_verification: boolean
  instructions: string | null
  qr_url: string | null
}

export type StorefrontPayload = {
  store: Omit<PublicStorefront, 'payment_methods'> & { payment_methods: PublicPaymentMethod[] }
  menu: PublicMenuCategory[]
}

const storefrontEndpoint = `${supabaseUrl}/functions/v1/pos-storefront`

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) throw new Error('Unexpected server response')
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Unexpected server response')
  return body as Record<string, unknown>
}

export async function loadStorefront(slug: string): Promise<StorefrontPayload> {
  const source = new URLSearchParams(window.location.search).get('source') === 'marketplace' ? 'marketplace' : 'qr'
  const response = await fetch(`${storefrontEndpoint}?slug=${encodeURIComponent(slug)}`, {
    headers: { apikey: supabasePublishableKey },
    referrerPolicy: 'strict-origin-when-cross-origin',
  })
  const body = await readJson(response)
  if (!response.ok || body.ok !== true) throw new Error(typeof body.error === 'string' ? body.error : 'Store unavailable')
  if (!body.store || typeof body.store !== 'object') throw new Error('Store unavailable')

  let menu = Array.isArray(body.menu) ? body.menu as PublicMenuCategory[] : []
  if (source === 'marketplace') {
    const [{ data: marketplaceStore, error: storeError }, { data: marketplaceMenu, error: menuError }] = await Promise.all([
      supabase.rpc('pos_marketplace_storefront', { p_slug: slug }),
      supabase.rpc('pos_public_marketplace_menu', { p_slug: slug }),
    ])
    if (storeError) throw storeError
    if (menuError) throw menuError
    if (!marketplaceStore) throw new Error('Marketplace ordering is not enabled for this store.')
    menu = (marketplaceMenu || []) as PublicMenuCategory[]
  }

  return { store: body.store as StorefrontPayload['store'], menu }
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
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: JSON.stringify({ action: 'create', clientId: guestClientId(), idempotencyKey: crypto.randomUUID(), source: input.source || 'qr', ...input, website: '' }),
  })
  const body = await readJson(response)
  if (!response.ok || body.ok !== true) throw new Error(typeof body.error === 'string' ? body.error : 'Order failed')
  if (!body.order || typeof body.order !== 'object') throw new Error('Order failed')
  return body.order as { order_id: string; order_number: number; tracking_token: string; total: number; status: OrderStatus; payment_status: PaymentStatus }
}

export async function loadGuestTracking(trackingToken: string) {
  const response = await fetch(`${posOrderEndpoint}?resource=track&token=${encodeURIComponent(trackingToken)}`, {
    headers: { apikey: supabasePublishableKey },
    referrerPolicy: 'strict-origin-when-cross-origin',
  })
  const body = await readJson(response)
  if (!response.ok || body.ok !== true) throw new Error(typeof body.error === 'string' ? body.error : 'Could not load order')
  if (!body.order || typeof body.order !== 'object') throw new Error('Could not load order')
  return body.order as { order_number: number; customer_name: string; fulfillment: Fulfillment; table_label: string | null; status: OrderStatus; payment_status: PaymentStatus; total: number; created_at: string; updated_at: string; messages: Array<{ sender_type: string; message: string; created_at: string }> }
}

export async function sendGuestChat(trackingToken: string, message: string) {
  const response = await fetch(posOrderEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabasePublishableKey },
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: JSON.stringify({ action: 'chat', trackingToken, message, website: '' }),
  })
  const body = await readJson(response)
  if (!response.ok || body.ok !== true) throw new Error(typeof body.error === 'string' ? body.error : 'Message failed')
}
