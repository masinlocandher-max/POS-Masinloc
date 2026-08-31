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

export type Order = {
  id: string
  customerName: string
  fulfillment: Fulfillment
  table?: string
  address?: string
  amount: number
  paymentMethod: PaymentMethod
  status: OrderStatus
  items: { name: string; qty: number; note?: string }[]
  createdAt: string
}

export const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount)
