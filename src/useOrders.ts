import { useCallback, useEffect, useState } from 'react'
import type { ChatMessage, Order, OrderStatus } from './domain'
import { seedChat, seedOrders } from './mockData'

const ORDERS_KEY = 'masinloc-pos.orders.v1'
const CHAT_KEY = 'masinloc-pos.chat.v1'

/**
 * Orders and order chat survive a reload.
 *
 * Staff on a phone lose the tab constantly — a call comes in, the screen
 * locks, the browser evicts the page. Losing the queue every time made the app
 * unusable on the devices it is meant for. This is still device-local demo
 * state; the server becomes the source of truth when the backend lands.
 */
const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked — the session simply is not persisted */
  }
}

export const nextStatus = (status: OrderStatus): OrderStatus => {
  if (status === 'awaiting_payment') return 'paid'
  if (status === 'payment_review') return 'paid'
  if (status === 'paid') return 'preparing'
  if (status === 'preparing') return 'ready'
  if (status === 'ready') return 'completed'
  return status
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(() => load(ORDERS_KEY, seedOrders))
  const [chat, setChat] = useState<Record<string, ChatMessage[]>>(() => load(CHAT_KEY, seedChat))

  useEffect(() => { save(ORDERS_KEY, orders) }, [orders])
  useEffect(() => { save(CHAT_KEY, chat) }, [chat])

  const advance = useCallback((id: string) => {
    setOrders(current => current.map(order => (
      order.id === id ? { ...order, status: nextStatus(order.status) } : order
    )))
    // Short confirmation buzz: staff act on these while looking at the food,
    // not the screen.
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(12)
  }, [])

  const addOrder = useCallback((order: Order) => {
    setOrders(current => [order, ...current])
  }, [])

  const sendMessage = useCallback((orderId: string, from: ChatMessage['from'], text: string) => {
    const message: ChatMessage = {
      id: `${orderId}-${Date.now()}`,
      from,
      text,
      at: new Date().toISOString(),
    }
    setChat(current => ({ ...current, [orderId]: [...(current[orderId] ?? []), message] }))
  }, [])

  const resetDemo = useCallback(() => {
    setOrders(seedOrders)
    setChat(seedChat)
  }, [])

  return { orders, chat, advance, addOrder, sendMessage, resetDemo }
}

/** Kitchens in Masinloc lose signal regularly; the UI has to say so. */
export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
