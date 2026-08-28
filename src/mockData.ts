import type { MenuItem, Order } from './domain'

export const menu: MenuItem[] = [
  { id: 'burger', name: 'Classic Burger', category: 'Meals', price: 220, available: true },
  { id: 'pancit', name: 'Pancit', category: 'Meals', price: 250, available: true },
  { id: 'mango', name: 'Mango Shake', category: 'Drinks', price: 120, available: true },
  { id: 'iced-tea', name: 'Iced Tea', category: 'Drinks', price: 80, available: true },
]

export const seedOrders: Order[] = [
  {
    id: '#128', customerName: 'Francine', fulfillment: 'dine_in', table: 'Table 6', amount: 680,
    paymentMethod: 'gcash', status: 'payment_review', createdAt: '2 min ago',
    items: [
      { name: 'Classic Burger', qty: 2, note: 'No mayonnaise' },
      { name: 'Mango Shake', qty: 2, note: 'Less ice' },
    ],
  },
  {
    id: '#127', customerName: 'Mika', fulfillment: 'pickup', amount: 370,
    paymentMethod: 'cash', status: 'preparing', createdAt: '8 min ago',
    items: [{ name: 'Pancit', qty: 1 }, { name: 'Mango Shake', qty: 1 }],
  },
]
