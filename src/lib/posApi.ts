import type { RealtimeChannel, Session } from '@supabase/supabase-js'
import { posOrderEndpoint, supabase, supabasePublishableKey } from './supabase'

export type MerchantRole = 'owner' | 'manager' | 'cashier' | 'kitchen'
export type Fulfillment = 'dine_in' | 'pickup' | 'delivery'
export type OrderStatus = 'parked' | 'awaiting_payment' | 'payment_review' | 'paid' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'pending_verification' | 'paid' | 'void' | 'refunded'
export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'qrph' | 'card' | 'room_charge'

export type MerchantContext = {
  merchant_id: string
  merchant_name: string
  merchant_slug: string
  merchant_status: string
  eligibility_status: string
  plan_code: string
  role: MerchantRole
  outlet_id: string | null
  outlet_name: string | null
}

export type AccessApplicationStatus = 'submitted' | 'under_review' | 'needs_changes' | 'approved' | 'rejected'

export type AccessApplication = {
  id: string
  contact_email: string
  owner_name: string
  business_name: string
  business_type: string
  barangay: string
  business_address: string
  mobile: string
  eligibility_confirmed: boolean
  status: AccessApplicationStatus
  review_notes: string | null
  merchant_id: string | null
  submitted_at: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type AccessApplicationInput = {
  ownerName: string
  businessName: string
  businessType: string
  barangay: string
  businessAddress: string
  mobile: string
  eligibilityConfirmed: boolean
}

export type PlanLimits = {
  plan_code: string
  product_limit: number
  staff_limit: number
  outlet_limit: number
  category_limit: number
  modifier_groups_per_product: number
  modifier_options_per_group: number
  max_order_lines: number
  max_order_quantity: number
}

export type DashboardData = {
  sales_today: number
  orders_today: number
  payment_review: number
  active_orders: number
  low_stock: number
}

export type CategoryRow = {
  id: string
  merchant_id: string
  name: string
  sort_order: number
  active: boolean
  archived_at: string | null
}

export type ProductRow = {
  id: string
  merchant_id: string
  category_id: string | null
  sku: string | null
  barcode: string | null
  name: string
  description: string | null
  price: number
  cost: number | null
  active: boolean
  archived_at: string | null
  track_inventory: boolean
  stock_on_hand: number
  low_stock_threshold: number
  sort_order: number
}

export type CustomerRow = {
  id: string
  display_name: string | null
  phone: string | null
  loyalty_opt_in: boolean
  visit_count: number
  lifetime_spend: number
  points_balance: number
  updated_at: string
}

export type OrderItemRow = {
  id: string
  product_name: string
  quantity: number
  note: string | null
  line_total: number | null
}

export type PaymentRow = {
  id: string
  method: PaymentMethod
  amount: number
  status: 'pending' | 'verified' | 'void' | 'refunded'
  reference_number: string | null
  created_at: string
}

export type OrderRow = {
  id: string
  order_number: number
  customer_name: string
  customer_phone: string | null
  source: 'pos' | 'qr' | 'marketplace' | 'phone'
  fulfillment: Fulfillment
  table_label: string | null
  delivery_address: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  subtotal: number
  delivery_fee: number
  total: number
  created_at: string
  updated_at: string
  pos_order_items: OrderItemRow[]
  pos_payments: PaymentRow[]
}

export type PublicModifierOption = { id: string; name: string; price_delta: number }
export type PublicModifierGroup = { id: string; name: string; min_select: number; max_select: number; required: boolean; options: PublicModifierOption[] }
export type PublicMenuProduct = { id: string; name: string; description: string | null; price: number; image_path: string | null; available: boolean; modifiers: PublicModifierGroup[] }
export type PublicMenuCategory = { id: string; name: string; products: PublicMenuProduct[] }
export type PublicStorefront = {
  merchant_id: string
  name: string
  slug: string
  currency: 'PHP'
  outlet: {
    id: string
    name: string
    dine_in_enabled: boolean
    pickup_enabled: boolean
    delivery_enabled: boolean
    delivery_fee: number
    minimum_delivery_order: number
  }
  payment_methods: Array<{
    id: string
    method: PaymentMethod
    label: string
    requires_manual_verification: boolean
    instructions: string | null
  }>
}

const toError = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error
  if (error && typeof error === 'object' && 'message' in error) return new Error(String((error as { message: unknown }).message))
  return new Error(fallback)
}

export const authApi = {
  session: async (): Promise<Session | null> => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.session
  },
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}

export async function getAccessApplication(): Promise<AccessApplication | null> {
  const { data, error } = await supabase.rpc('pos_my_access_application')
  if (error) throw error
  return (data || null) as AccessApplication | null
}

export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('pos_is_platform_admin')
  if (error) throw error
  return data === true
}

export async function getAccessApplicationsForReview(): Promise<AccessApplication[]> {
  const { data, error } = await supabase
    .from('pos_access_applications')
    .select('id,contact_email,owner_name,business_name,business_type,barangay,business_address,mobile,eligibility_confirmed,status,review_notes,merchant_id,submitted_at,reviewed_at,created_at,updated_at')
    .order('submitted_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []) as AccessApplication[]
}

export async function reviewAccessApplication(applicationId: string, decision: Exclude<AccessApplicationStatus, 'submitted'>, reason?: string) {
  const { data, error } = await supabase.rpc('pos_admin_review_access_application', {
    p_application_id: applicationId,
    p_decision: decision,
    p_reason: reason?.trim() || null,
  })
  if (error) throw error
  return data as { application_id: string; status: AccessApplicationStatus; merchant_id: string | null }
}

export async function submitAccessApplication(input: AccessApplicationInput) {
  const { data, error } = await supabase.rpc('pos_submit_access_application', {
    p_owner_name: input.ownerName,
    p_business_name: input.businessName,
    p_business_type: input.businessType,
    p_barangay: input.barangay,
    p_business_address: input.businessAddress,
    p_mobile: input.mobile,
    p_eligibility_confirmed: input.eligibilityConfirmed,
  })
  if (error) throw error
  return data as { id: string; status: AccessApplicationStatus; submitted_at: string }
}

export async function getMerchantContexts(): Promise<MerchantContext[]> {
  const { data, error } = await supabase.rpc('pos_my_contexts')
  if (error) throw error
  return (data || []) as MerchantContext[]
}

export async function getPlanLimits(planCode: string): Promise<PlanLimits> {
  const { data, error } = await supabase.from('pos_plan_limits').select('*').eq('plan_code', planCode).single()
  if (error) throw error
  return data as PlanLimits
}

export async function getDashboard(merchantId: string, outletId?: string | null): Promise<DashboardData> {
  const { data, error } = await supabase.rpc('pos_dashboard', { p_merchant_id: merchantId, p_outlet_id: outletId || null })
  if (error) throw error
  return data as DashboardData
}

export async function getCatalog(merchantId: string) {
  const [{ data: categories, error: categoryError }, { data: products, error: productError }] = await Promise.all([
    supabase.from('pos_categories').select('*').eq('merchant_id', merchantId).is('archived_at', null).order('sort_order').order('name'),
    supabase.from('pos_products').select('*').eq('merchant_id', merchantId).is('archived_at', null).order('sort_order').order('name'),
  ])
  if (categoryError) throw categoryError
  if (productError) throw productError
  return { categories: (categories || []) as CategoryRow[], products: (products || []) as ProductRow[] }
}

export async function getCustomers(merchantId: string): Promise<CustomerRow[]> {
  const { data, error } = await supabase.from('pos_customers').select('id,display_name,phone,loyalty_opt_in,visit_count,lifetime_spend,points_balance,updated_at').eq('merchant_id', merchantId).order('updated_at', { ascending: false }).limit(200)
  if (error) throw error
  return (data || []) as CustomerRow[]
}

export async function getOrders(merchantId: string, limit = 100): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('pos_orders')
    .select('id,order_number,customer_name,customer_phone,source,fulfillment,table_label,delivery_address,status,payment_status,subtotal,delivery_fee,total,created_at,updated_at,pos_order_items(id,product_name,quantity,note,line_total),pos_payments(id,method,amount,status,reference_number,created_at)')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as unknown as OrderRow[]
}

export async function createCategory(merchantId: string, name: string) {
  const { data, error } = await supabase.from('pos_categories').insert({ merchant_id: merchantId, name: name.trim() }).select().single()
  if (error) throw error
  return data as CategoryRow
}

export async function createProduct(input: {
  merchantId: string
  categoryId: string | null
  name: string
  price: number
  sku?: string
  trackInventory?: boolean
  openingStock?: number
  lowStockThreshold?: number
}) {
  const { data, error } = await supabase.from('pos_products').insert({
    merchant_id: input.merchantId,
    category_id: input.categoryId,
    name: input.name.trim(),
    price: input.price,
    sku: input.sku?.trim() || null,
    track_inventory: Boolean(input.trackInventory),
    stock_on_hand: input.trackInventory ? Math.max(0, input.openingStock || 0) : 0,
    low_stock_threshold: input.trackInventory ? Math.max(0, input.lowStockThreshold || 0) : 0,
  }).select().single()
  if (error) throw error
  return data as ProductRow
}

export async function archiveProduct(productId: string) {
  const { error } = await supabase.from('pos_products').update({ active: false, archived_at: new Date().toISOString() }).eq('id', productId)
  if (error) throw error
}

export async function setProductAvailability(productId: string, active: boolean) {
  const { error } = await supabase.from('pos_products').update({ active }).eq('id', productId)
  if (error) throw error
}

export async function recordInventoryMovement(productId: string, delta: number, reason: 'restock' | 'adjustment' | 'waste', note?: string) {
  const { data, error } = await supabase.rpc('pos_record_inventory_movement', { p_product_id: productId, p_delta: delta, p_reason: reason, p_note: note || null })
  if (error) throw error
  return data as string
}

export async function createStaffOrder(input: {
  merchantId: string
  outletId: string
  fulfillment: Fulfillment
  customerName: string
  items: Array<{ product_id: string; quantity: number; note?: string; modifier_option_ids?: string[] }>
  paymentMethod: PaymentMethod
  tableLabel?: string
  customerPhone?: string
  notes?: string
  park?: boolean
}) {
  const { data, error } = await supabase.rpc('pos_create_staff_order', {
    p_merchant_id: input.merchantId,
    p_outlet_id: input.outletId,
    p_fulfillment: input.fulfillment,
    p_customer_name: input.customerName,
    p_items: input.items,
    p_payment_method: input.paymentMethod,
    p_table_label: input.tableLabel || null,
    p_customer_phone: input.customerPhone || null,
    p_notes: input.notes || null,
    p_park: Boolean(input.park),
    p_idempotency_key: crypto.randomUUID(),
  })
  if (error) throw error
  return data as { order_id: string; order_number: number; total: number; status: OrderStatus }
}

export async function confirmPayment(orderId: string, referenceNumber?: string) {
  const { data, error } = await supabase.rpc('pos_confirm_payment', { p_order_id: orderId, p_reference_number: referenceNumber || null })
  if (error) throw error
  return data
}

export async function advanceOrder(orderId: string, status: OrderStatus) {
  const { data, error } = await supabase.rpc('pos_advance_order', { p_order_id: orderId, p_target_status: status })
  if (error) throw error
  return data
}

export async function cancelUnpaidOrder(orderId: string, reason: string) {
  const { data, error } = await supabase.rpc('pos_cancel_unpaid_order', { p_order_id: orderId, p_reason: reason })
  if (error) throw error
  return data
}

export function subscribeToOrders(merchantId: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`pos-orders-${merchantId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_orders', filter: `merchant_id=eq.${merchantId}` }, onChange)
    .subscribe()
}

export async function getPublicStorefront(slug: string): Promise<PublicStorefront | null> {
  const { data, error } = await supabase.rpc('pos_public_storefront', { p_slug: slug })
  if (error) throw error
  return (data || null) as PublicStorefront | null
}

export async function getPublicMenu(slug: string): Promise<PublicMenuCategory[]> {
  const { data, error } = await supabase.rpc('pos_public_menu', { p_slug: slug })
  if (error) throw error
  return (data || []) as PublicMenuCategory[]
}

function guestClientId() {
  const key = 'masinloc-pos-guest-client-id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}

export async function createGuestOrder(input: {
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
  const { data, error } = await supabase.functions.invoke('pos-order', {
    body: {
      action: 'create',
      clientId: guestClientId(),
      idempotencyKey: crypto.randomUUID(),
      source: input.source || 'qr',
      ...input,
      website: '',
    },
  })
  if (error) throw toError(error, 'Order failed')
  if (!data?.ok) throw new Error(data?.error || 'Order failed')
  return data.order as { order_id: string; order_number: number; tracking_token: string; total: number; status: OrderStatus; payment_status: PaymentStatus }
}

export async function getGuestTracking(trackingToken: string) {
  const response = await fetch(`${posOrderEndpoint}?resource=track&token=${encodeURIComponent(trackingToken)}`, {
    headers: { apikey: supabasePublishableKey },
  })
  const body = await response.json()
  if (!response.ok || !body.ok) throw new Error(body.error || 'Could not load order')
  return body.order as { order_number: number; customer_name: string; fulfillment: Fulfillment; table_label: string | null; status: OrderStatus; payment_status: PaymentStatus; total: number; created_at: string; updated_at: string; messages: Array<{ sender_type: string; message: string; created_at: string }> }
}

export async function sendGuestMessage(trackingToken: string, message: string) {
  const { data, error } = await supabase.functions.invoke('pos-order', { body: { action: 'chat', trackingToken, message, website: '' } })
  if (error) throw toError(error, 'Message failed')
  if (!data?.ok) throw new Error(data?.error || 'Message failed')
}
