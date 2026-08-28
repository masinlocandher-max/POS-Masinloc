import { supabase } from './supabase'
import type { PaymentMethod } from './posApi'

export type PaymentMethodRow = {
  id: string
  merchant_id: string
  outlet_id: string
  method: PaymentMethod
  label: string
  enabled: boolean
  requires_manual_verification: boolean
  qr_image_path: string | null
  instructions: string | null
  sort_order: number
}

export type ExpenseRow = {
  id: string
  category: string
  amount: number
  note: string | null
  expense_date: string
  created_at: string
}

export type CashSessionRow = {
  id: string
  outlet_id: string
  opening_float: number
  closing_count: number | null
  status: 'open' | 'closed'
  opened_at: string
  closed_at: string | null
  opened_by: string
}

export type AttendanceRow = {
  id: string
  user_id: string
  outlet_id: string
  clock_in_at: string
  clock_out_at: string | null
}

export type AuditRow = {
  id: string
  action: string
  actor_type: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export async function getPaymentMethods(merchantId: string, outletId: string): Promise<PaymentMethodRow[]> {
  const { data, error } = await supabase.from('pos_payment_methods').select('*').eq('merchant_id', merchantId).eq('outlet_id', outletId).order('sort_order').order('label')
  if (error) throw error
  return (data || []) as PaymentMethodRow[]
}

export async function upsertPaymentMethod(input: Omit<PaymentMethodRow, 'id' | 'merchant_id' | 'outlet_id'> & { merchantId: string; outletId: string }) {
  const { data, error } = await supabase.from('pos_payment_methods').upsert({
    merchant_id: input.merchantId,
    outlet_id: input.outletId,
    method: input.method,
    label: input.label,
    enabled: input.enabled,
    requires_manual_verification: input.requires_manual_verification,
    qr_image_path: input.qr_image_path,
    instructions: input.instructions,
    sort_order: input.sort_order,
  }, { onConflict: 'outlet_id,method' }).select().single()
  if (error) throw error
  return data as PaymentMethodRow
}

export async function getExpenses(merchantId: string): Promise<ExpenseRow[]> {
  const { data, error } = await supabase.from('pos_expenses').select('id,category,amount,note,expense_date,created_at').eq('merchant_id', merchantId).order('expense_date', { ascending: false }).order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return (data || []) as ExpenseRow[]
}

export async function createExpense(input: { merchantId: string; outletId: string; category: string; amount: number; note?: string }) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError || new Error('Sign in required')
  const { data, error } = await supabase.from('pos_expenses').insert({
    merchant_id: input.merchantId,
    outlet_id: input.outletId,
    category: input.category.trim(),
    amount: input.amount,
    note: input.note?.trim() || null,
    created_by: userData.user.id,
  }).select().single()
  if (error) throw error
  return data as ExpenseRow
}

export async function getCashSessions(merchantId: string, outletId: string): Promise<CashSessionRow[]> {
  const { data, error } = await supabase.from('pos_cash_sessions').select('id,outlet_id,opening_float,closing_count,status,opened_at,closed_at,opened_by').eq('merchant_id', merchantId).eq('outlet_id', outletId).order('opened_at', { ascending: false }).limit(50)
  if (error) throw error
  return (data || []) as CashSessionRow[]
}

export async function openCashSession(merchantId: string, outletId: string, openingFloat: number) {
  const { data, error } = await supabase.rpc('pos_open_cash_session', { p_merchant_id: merchantId, p_outlet_id: outletId, p_opening_float: openingFloat })
  if (error) throw error
  return data as string
}

export async function closeCashSession(cashSessionId: string, closingCount: number) {
  const { data, error } = await supabase.rpc('pos_close_cash_session', { p_cash_session_id: cashSessionId, p_closing_count: closingCount })
  if (error) throw error
  return data as { cash_session_id: string; expected: number; counted: number; variance: number }
}

export async function recordCashMovement(cashSessionId: string, type: 'cash_in' | 'cash_out' | 'expense', amount: number, note?: string) {
  const { data, error } = await supabase.rpc('pos_record_cash_movement', { p_cash_session_id: cashSessionId, p_type: type, p_amount: amount, p_note: note || null })
  if (error) throw error
  return data as string
}

export async function getAttendance(merchantId: string): Promise<AttendanceRow[]> {
  const { data, error } = await supabase.from('pos_attendance').select('id,user_id,outlet_id,clock_in_at,clock_out_at').eq('merchant_id', merchantId).order('clock_in_at', { ascending: false }).limit(100)
  if (error) throw error
  return (data || []) as AttendanceRow[]
}

export async function clockIn(merchantId: string, outletId: string) {
  const { data, error } = await supabase.rpc('pos_clock_in', { p_merchant_id: merchantId, p_outlet_id: outletId, p_verification_path: null })
  if (error) throw error
  return data as string
}

export async function clockOut(merchantId: string) {
  const { data, error } = await supabase.rpc('pos_clock_out', { p_merchant_id: merchantId })
  if (error) throw error
  return data as string
}

export async function getAuditTrail(merchantId: string): Promise<AuditRow[]> {
  const { data, error } = await supabase.from('pos_audit_events').select('id,action,actor_type,entity_type,entity_id,metadata,created_at').eq('merchant_id', merchantId).order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return (data || []) as unknown as AuditRow[]
}

export async function updateOutletDelivery(input: { outletId: string; enabled: boolean; fee: number; minimumOrder: number }) {
  const { data, error } = await supabase.from('pos_outlets').update({ delivery_enabled: input.enabled, delivery_fee: input.fee, minimum_delivery_order: input.minimumOrder }).eq('id', input.outletId).select().single()
  if (error) throw error
  return data
}
