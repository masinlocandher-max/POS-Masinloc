import { FormEvent, useEffect, useMemo, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import { getMerchantContexts, type MerchantContext, type OrderStatus } from './lib/posApi'
import './staff-chat.css'

type ChatOrder = {
  id: string
  order_number: number
  customer_name: string
  status: OrderStatus
  updated_at: string
}

type ChatMessage = {
  id: string
  order_id: string
  sender_type: 'customer' | 'staff' | 'system'
  sender_user_id: string | null
  message: string
  created_at: string
}

const CLOSED = new Set<OrderStatus>(['completed', 'cancelled'])

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return 'Chat is unavailable right now.'
}

export default function StaffChatOverlay() {
  const [context, setContext] = useState<MerchantContext | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [orders, setOrders] = useState<ChatOrder[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const isGuestStorefront = useMemo(() => new URLSearchParams(window.location.search).has('store'), [])
  const selected = orders.find(order => order.id === selectedOrderId) || null

  const loadOrders = async (merchantId: string) => {
    const { data, error: queryError } = await supabase
      .from('pos_orders')
      .select('id,order_number,customer_name,status,updated_at')
      .eq('merchant_id', merchantId)
      .not('status', 'in', '(completed,cancelled)')
      .order('updated_at', { ascending: false })
      .limit(100)
    if (queryError) throw queryError
    const next = (data || []) as ChatOrder[]
    setOrders(next)
    setSelectedOrderId(current => current && next.some(order => order.id === current) ? current : next[0]?.id || null)
  }

  const loadMessages = async (merchantId: string, orderId: string) => {
    const { data, error: queryError } = await supabase
      .from('pos_chat_messages')
      .select('id,order_id,sender_type,sender_user_id,message,created_at')
      .eq('merchant_id', merchantId)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .limit(200)
    if (queryError) throw queryError
    setMessages((data || []) as ChatMessage[])
  }

  useEffect(() => {
    if (isGuestStorefront) return
    let cancelled = false

    const boot = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (cancelled) return
        setUserId(data.session?.user.id || null)
        if (!data.session) { setContext(null); return }
        const contexts = await getMerchantContexts()
        if (cancelled) return
        const next = contexts[0] || null
        setContext(next)
        if (next) await loadOrders(next.merchant_id)
      } catch (err) {
        if (!cancelled) setError(messageOf(err))
      }
    }

    void boot()
    const { data: authSub } = supabase.auth.onAuthStateChange(() => void boot())
    return () => { cancelled = true; authSub.subscription.unsubscribe() }
  }, [isGuestStorefront])

  useEffect(() => {
    if (!context) return
    const channel = supabase
      .channel(`pos-staff-chat-${context.merchant_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_chat_messages', filter: `merchant_id=eq.${context.merchant_id}` }, payload => {
        const row = payload.new as Partial<ChatMessage>
        if (row.order_id === selectedOrderId && selectedOrderId) void loadMessages(context.merchant_id, selectedOrderId)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pos_orders', filter: `merchant_id=eq.${context.merchant_id}` }, () => void loadOrders(context.merchant_id))
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [context?.merchant_id, selectedOrderId])

  useEffect(() => {
    if (!context || !selectedOrderId) { setMessages([]); return }
    void loadMessages(context.merchant_id, selectedOrderId).catch(err => setError(messageOf(err)))
  }, [context?.merchant_id, selectedOrderId])

  if (isGuestStorefront || !context || !userId) return null

  const send = async (event: FormEvent) => {
    event.preventDefault()
    const message = draft.trim()
    if (!selected || !message || CLOSED.has(selected.status) || sending) return
    setSending(true); setError('')
    try {
      const { error: insertError } = await supabase.from('pos_chat_messages').insert({
        order_id: selected.id,
        merchant_id: context.merchant_id,
        sender_type: 'staff',
        sender_user_id: userId,
        message,
      })
      if (insertError) throw insertError
      setDraft('')
      await loadMessages(context.merchant_id, selected.id)
    } catch (err) {
      setError(messageOf(err))
      await loadOrders(context.merchant_id)
    } finally {
      setSending(false)
    }
  }

  return <>
    <button className="staff-chat-launcher" onClick={() => setOpen(value => !value)} aria-label="Order chat">
      <MessageCircle />
      {orders.length > 0 && <span>{orders.length > 99 ? '99+' : orders.length}</span>}
    </button>

    {open && <section className="staff-chat-panel" aria-label="Order chat panel">
      <header><div><strong>Order chat</strong><small>{context.merchant_name}</small></div><button onClick={() => setOpen(false)} aria-label="Close chat"><X /></button></header>
      {error && <div className="staff-chat-error">{error}</div>}
      {orders.length === 0 ? <div className="staff-chat-empty"><MessageCircle /><strong>No open order chats.</strong><span>Completed and cancelled orders are closed automatically.</span></div> : <>
        <div className="staff-chat-orders" role="tablist" aria-label="Open orders">
          {orders.map(order => <button key={order.id} className={order.id === selectedOrderId ? 'active' : ''} onClick={() => setSelectedOrderId(order.id)}>
            <strong>#{order.order_number}</strong><span>{order.customer_name}</span><small>{order.status.replaceAll('_', ' ')}</small>
          </button>)}
        </div>
        <div className="staff-chat-thread">
          {messages.length === 0 ? <p className="staff-chat-no-message">No messages yet.</p> : messages.map(item => <div key={item.id} className={`staff-chat-message ${item.sender_type}`}>
            <span>{item.message}</span><small>{item.sender_type === 'staff' ? 'Store' : item.sender_type === 'customer' ? 'Customer' : 'System'} · {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
          </div>)}
        </div>
        <form className="staff-chat-compose" onSubmit={send}>
          <input value={draft} maxLength={1000} onChange={event => setDraft(event.target.value)} placeholder="Reply to this order" aria-label="Reply to order" />
          <button className="primary" disabled={sending || !draft.trim()} aria-label="Send reply"><Send /></button>
        </form>
      </>}
    </section>}
  </>
}
