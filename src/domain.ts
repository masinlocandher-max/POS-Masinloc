export type Fulfillment = 'dine_in' | 'pickup' | 'delivery'
export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'qrph' | 'card'
export type OrderStatus = 'awaiting_payment' | 'payment_review' | 'paid' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed'

export type MenuItem = {
  id: string
  name: string
  category: string
  price: number
  available: boolean
}

export type OrderItem = { name: string; qty: number; note?: string }

export type Order = {
  id: string
  customerName: string
  fulfillment: Fulfillment
  table?: string
  address?: string
  amount: number
  paymentMethod: PaymentMethod
  status: OrderStatus
  items: OrderItem[]
  /** ISO timestamp; rendered as a live relative age so tickets stay honest. */
  placedAt: string
}

export type ChatMessage = {
  id: string
  from: 'store' | 'customer'
  text: string
  at: string
}

export const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount)

/** "Just now" / "8 min" / "1 hr 5 min" — kitchen tickets need age, not a clock. */
export const elapsed = (iso: string, now: number = Date.now()) => {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`
}

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })

export const statusLabel: Record<OrderStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  payment_review: 'Verify payment',
  paid: 'Paid',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
}

export const fulfillmentLabel: Record<Fulfillment, string> = {
  dine_in: 'Dine In',
  pickup: 'Pick Up',
  delivery: 'Delivery',
}

/** Statuses that still need someone to do something. */
export const OPEN_STATUSES: OrderStatus[] = ['awaiting_payment', 'payment_review', 'paid', 'preparing', 'ready', 'out_for_delivery']

/** Statuses the kitchen is responsible for. */
export const KITCHEN_STATUSES: OrderStatus[] = ['paid', 'preparing', 'ready']
