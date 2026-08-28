import type { ChatMessage, MenuItem, Order } from './domain'

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString()

export const menu: MenuItem[] = [
  { id: 'burger', name: 'Classic Burger', category: 'Meals', price: 220, available: true },
  { id: 'pancit', name: 'Pancit', category: 'Meals', price: 250, available: true },
  { id: 'sisig', name: 'Pork Sisig', category: 'Meals', price: 280, available: true },
  { id: 'inihaw', name: 'Inihaw na Bangus', category: 'Meals', price: 320, available: false },
  { id: 'mango', name: 'Mango Shake', category: 'Drinks', price: 120, available: true },
  { id: 'iced-tea', name: 'Iced Tea', category: 'Drinks', price: 80, available: true },
  { id: 'buko', name: 'Buko Juice', category: 'Drinks', price: 90, available: true },
  { id: 'halo-halo', name: 'Halo-Halo', category: 'Desserts', price: 150, available: true },
]

export const seedOrders: Order[] = [
  {
    id: '#128', customerName: 'Francine', fulfillment: 'dine_in', table: 'Table 6', amount: 680,
    paymentMethod: 'gcash', status: 'payment_review', placedAt: minutesAgo(2),
    items: [
      { name: 'Classic Burger', qty: 2, note: 'No mayonnaise' },
      { name: 'Mango Shake', qty: 2, note: 'Less ice' },
    ],
  },
  {
    id: '#127', customerName: 'Mika', fulfillment: 'pickup', amount: 370,
    paymentMethod: 'cash', status: 'preparing', placedAt: minutesAgo(8),
    items: [{ name: 'Pancit', qty: 1 }, { name: 'Mango Shake', qty: 1 }],
  },
  {
    id: '#126', customerName: 'Rico', fulfillment: 'delivery', address: 'Brgy. Baloganon, Masinloc', amount: 560,
    paymentMethod: 'maya', status: 'paid', placedAt: minutesAgo(11),
    items: [{ name: 'Pork Sisig', qty: 2, note: 'Extra spicy' }],
  },
  {
    id: '#125', customerName: 'Ana', fulfillment: 'dine_in', table: 'Table 2', amount: 230,
    paymentMethod: 'gcash', status: 'ready', placedAt: minutesAgo(19),
    items: [{ name: 'Halo-Halo', qty: 1 }, { name: 'Iced Tea', qty: 1 }],
  },
]

export const seedChat: Record<string, ChatMessage[]> = {
  '#128': [
    { id: '#128-1', from: 'customer', text: 'Hi, can you make the burgers well done?', at: minutesAgo(2) },
    { id: '#128-2', from: 'store', text: 'Noted po, well done both burgers.', at: minutesAgo(1) },
  ],
  '#127': [
    { id: '#127-1', from: 'customer', text: 'What time can I pick this up?', at: minutesAgo(6) },
  ],
}
