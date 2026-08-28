import { useEffect, useMemo, useState } from 'react'
import {
  Bike,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  Home,
  Menu as MenuIcon,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  Send,
  ShoppingBag,
  Store,
  Timer,
  Utensils,
  WifiOff,
} from 'lucide-react'
import type { ChatMessage, Fulfillment, Order, OrderStatus, PaymentMethod } from './domain'
import {
  clockTime,
  elapsed,
  fulfillmentLabel,
  KITCHEN_STATUSES,
  money,
  OPEN_STATUSES,
  statusLabel,
} from './domain'
import { menu } from './mockData'
import { useOnline, useOrders } from './useOrders'

type MerchantTab = 'home' | 'orders' | 'pos' | 'kitchen' | 'more'
type MerchantView = { screen: 'tab' } | { screen: 'customers' } | { screen: 'chat'; orderId?: string }
type GuestStep = 'name' | 'fulfillment' | 'menu' | 'checkout' | 'tracking'

const advanceLabel = (status: OrderStatus) => {
  if (status === 'payment_review') return 'Confirm payment'
  if (status === 'awaiting_payment') return 'Cash received'
  if (status === 'paid') return 'Send to kitchen'
  if (status === 'preparing') return 'Mark ready'
  return 'Complete order'
}

const orderPlace = (order: Order) =>
  order.fulfillment === 'dine_in'
    ? order.table ?? 'Dine In'
    : order.fulfillment === 'pickup'
      ? 'Pick up'
      : order.address ?? 'Delivery'

/** Re-render on a timer so ticket ages stay truthful without a page refresh. */
function useTicker(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function Brand() {
  return (
    <div className="brand" aria-label="Masinloc Zambales">
      <div className="brand-mark"><span /><span /><span /><span /></div>
      <div><strong>MASINLOC</strong><small>ZAMBALES</small></div>
    </div>
  )
}

function App() {
  const [mode, setMode] = useState<'merchant' | 'guest'>('merchant')
  const [tab, setTab] = useState<MerchantTab>('home')
  const [view, setView] = useState<MerchantView>({ screen: 'tab' })
  const { orders, chat, advance, addOrder, sendMessage, resetDemo } = useOrders()
  const online = useOnline()
  const now = useTicker()

  const unread = useMemo(
    () => Object.entries(chat).filter(([orderId, messages]) => (
      messages.at(-1)?.from === 'customer' && orders.some(order => order.id === orderId)
    )).length,
    [chat, orders],
  )

  if (mode === 'guest') {
    return (
      <GuestOrdering
        chat={chat}
        onClose={() => setMode('merchant')}
        onCreateOrder={addOrder}
        onSendMessage={sendMessage}
      />
    )
  }

  if (view.screen === 'customers') {
    return (
      <SubScreen title="Customers" onBack={() => setView({ screen: 'tab' })}>
        <CustomersScreen orders={orders} />
      </SubScreen>
    )
  }

  if (view.screen === 'chat') {
    return (
      <SubScreen title="Order chat" onBack={() => setView({ screen: 'tab' })}>
        <ChatScreen
          orders={orders}
          chat={chat}
          openOrderId={view.orderId}
          onSend={(orderId, text) => sendMessage(orderId, 'store', text)}
        />
      </SubScreen>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <button className="ghost-action" onClick={() => setMode('guest')}><QrCode size={18} /> Guest demo</button>
      </header>

      {!online && (
        <p className="offline-banner" role="status">
          <WifiOff size={15} /> Offline — changes are saved on this device and stay here until you reconnect.
        </p>
      )}

      <main className="content">
        {tab === 'home' && (
          <HomeScreen
            orders={orders}
            now={now}
            unread={unread}
            setTab={setTab}
            openChat={() => setView({ screen: 'chat' })}
          />
        )}
        {tab === 'orders' && (
          <OrdersScreen
            orders={orders}
            now={now}
            onAdvance={advance}
            onChat={orderId => setView({ screen: 'chat', orderId })}
          />
        )}
        {tab === 'pos' && <PosScreen onCreateOrder={addOrder} />}
        {tab === 'kitchen' && <KitchenScreen orders={orders} now={now} onAdvance={advance} />}
        {tab === 'more' && (
          <MoreScreen
            unread={unread}
            onCustomers={() => setView({ screen: 'customers' })}
            onChat={() => setView({ screen: 'chat' })}
            onReset={resetDemo}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        <NavButton active={tab === 'home'} icon={<Home />} label="Home" onClick={() => setTab('home')} />
        <NavButton active={tab === 'orders'} icon={<ClipboardList />} label="Orders" onClick={() => setTab('orders')} />
        <NavButton active={tab === 'pos'} icon={<Store />} label="POS" onClick={() => setTab('pos')} />
        <NavButton
          active={tab === 'kitchen'}
          icon={<ChefHat />}
          label="Kitchen"
          badge={orders.filter(order => KITCHEN_STATUSES.includes(order.status)).length}
          onClick={() => setTab('kitchen')}
        />
        <NavButton active={tab === 'more'} icon={<MenuIcon />} label="More" badge={unread} onClick={() => setTab('more')} />
      </nav>
    </div>
  )
}

function NavButton({ active, icon, label, badge, onClick }: {
  active: boolean
  icon: React.ReactNode
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button className={active ? 'nav-button active' : 'nav-button'} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <span className="nav-icon">
        {icon}
        {badge ? <i className="nav-badge" aria-hidden="true">{badge > 9 ? '9+' : badge}</i> : null}
      </span>
      <span>{label}</span>
    </button>
  )
}

function SubScreen({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-button" onClick={onBack} aria-label="Back"><ChevronLeft /></button>
        <strong className="subscreen-title">{title}</strong>
        <span className="topbar-spacer" />
      </header>
      <main className="content content-flush">{children}</main>
    </div>
  )
}

function HomeScreen({ orders, now, unread, setTab, openChat }: {
  orders: Order[]
  now: number
  unread: number
  setTab: (tab: MerchantTab) => void
  openChat: () => void
}) {
  const attention = orders.filter(order => OPEN_STATUSES.includes(order.status))
  // Only money that is actually confirmed counts as sales — an order still
  // waiting on payment verification is not revenue.
  const sales = orders
    .filter(order => !['awaiting_payment', 'payment_review'].includes(order.status))
    .reduce((sum, order) => sum + order.amount, 0)

  return (
    <section>
      <div className="page-heading">
        <div><p className="eyebrow">ABC Café · Masinloc</p><h1>Good afternoon.</h1></div>
        <span className="open-badge">Open</span>
      </div>
      <div className="metric-strip">
        <div><span>Sales today</span><strong>{money(sales)}</strong></div>
        <div><span>Orders</span><strong>{orders.length}</strong></div>
        <div><span>Needs attention</span><strong>{attention.length}</strong></div>
      </div>
      <div className="section-title"><h2>Needs attention</h2><button onClick={() => setTab('orders')}>See all</button></div>
      <div className="order-stack">
        {attention.length
          ? attention.slice(0, 3).map(order => <OrderCard key={order.id} order={order} now={now} />)
          : <Empty label="Everything is handled." />}
      </div>
      <div className="quick-grid">
        <button onClick={() => setTab('pos')}><Store /><span><strong>New sale</strong><small>Open POS</small></span></button>
        <button onClick={() => setTab('kitchen')}><ChefHat /><span><strong>Kitchen</strong><small>Active tickets</small></span></button>
        <button onClick={() => setTab('orders')}><QrCode /><span><strong>Payments</strong><small>Verify orders</small></span></button>
        <button onClick={openChat}>
          <MessageCircle />
          <span><strong>Messages{unread ? ` · ${unread}` : ''}</strong><small>Order chats</small></span>
        </button>
      </div>
    </section>
  )
}

function OrderCard({ order, now, onAdvance, onChat }: {
  order: Order
  now: number
  onAdvance?: (id: string) => void
  onChat?: (id: string) => void
}) {
  return (
    <article className="order-card">
      <div className="order-card-top">
        <div>
          <strong>{order.id} · {order.customerName}</strong>
          <span>{orderPlace(order)} · {elapsed(order.placedAt, now)}</span>
        </div>
        <span className={`status status-${order.status}`}>{statusLabel[order.status]}</span>
      </div>
      <div className="order-items">
        {order.items.map((item, index) => (
          <p key={index}>{item.qty}× {item.name}{item.note ? <small>{item.note}</small> : null}</p>
        ))}
      </div>
      <div className="order-bottom">
        <strong>{money(order.amount)}</strong>
        <span>{order.paymentMethod.toUpperCase()}</span>
      </div>
      {(onAdvance || onChat) && OPEN_STATUSES.includes(order.status) && (
        <div className="order-actions">
          {onChat && (
            <button className="secondary small" onClick={() => onChat(order.id)}>
              <MessageCircle size={17} /> Chat
            </button>
          )}
          {onAdvance && (
            <button className="primary small" onClick={() => onAdvance(order.id)}>
              {advanceLabel(order.status)}
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function OrdersScreen({ orders, now, onAdvance, onChat }: {
  orders: Order[]
  now: number
  onAdvance: (id: string) => void
  onChat: (id: string) => void
}) {
  const [filter, setFilter] = useState<'active' | 'payment' | 'ready' | 'done'>('active')
  const visible = orders.filter(order => {
    if (filter === 'payment') return ['payment_review', 'awaiting_payment'].includes(order.status)
    if (filter === 'ready') return ['ready', 'out_for_delivery'].includes(order.status)
    if (filter === 'done') return order.status === 'completed'
    return ['paid', 'preparing'].includes(order.status)
  })

  const count = (test: (status: OrderStatus) => boolean) => orders.filter(order => test(order.status)).length

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">Operations</p><h1>Orders</h1></div></div>
      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={filter === 'active'} className={filter === 'active' ? 'selected' : ''} onClick={() => setFilter('active')}>
          Active{count(s => ['paid', 'preparing'].includes(s)) ? ` ${count(s => ['paid', 'preparing'].includes(s))}` : ''}
        </button>
        <button role="tab" aria-selected={filter === 'payment'} className={filter === 'payment' ? 'selected' : ''} onClick={() => setFilter('payment')}>
          Payments{count(s => ['payment_review', 'awaiting_payment'].includes(s)) ? ` ${count(s => ['payment_review', 'awaiting_payment'].includes(s))}` : ''}
        </button>
        <button role="tab" aria-selected={filter === 'ready'} className={filter === 'ready' ? 'selected' : ''} onClick={() => setFilter('ready')}>Ready</button>
        <button role="tab" aria-selected={filter === 'done'} className={filter === 'done' ? 'selected' : ''} onClick={() => setFilter('done')}>Done</button>
      </div>
      <div className="order-stack">
        {visible.length
          ? visible.map(order => <OrderCard key={order.id} order={order} now={now} onAdvance={onAdvance} onChat={onChat} />)
          : <Empty label="No orders here." />}
      </div>
    </section>
  )
}

function KitchenScreen({ orders, now, onAdvance }: { orders: Order[]; now: number; onAdvance: (id: string) => void }) {
  const tickets = orders
    .filter(order => KITCHEN_STATUSES.includes(order.status))
    .slice()
    .sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime())

  return (
    <section>
      <div className="page-heading">
        <div><p className="eyebrow">Kitchen display</p><h1>Tickets</h1></div>
        <span className="open-badge">{tickets.length} open</span>
      </div>
      <p className="body-copy kitchen-note">
        Oldest ticket first. Only paid or cash-confirmed orders reach the kitchen.
      </p>
      <div className="ticket-stack">
        {tickets.length ? tickets.map(order => {
          const minutes = Math.floor((now - new Date(order.placedAt).getTime()) / 60000)
          const urgency = minutes >= 20 ? 'late' : minutes >= 10 ? 'warn' : 'fresh'
          return (
            <article className={`ticket ticket-${urgency}`} key={order.id}>
              <div className="ticket-head">
                <div>
                  <strong>{order.id}</strong>
                  <span>{order.customerName} · {fulfillmentLabel[order.fulfillment]}{order.table ? ` · ${order.table}` : ''}</span>
                </div>
                <span className="ticket-timer"><Timer size={14} /> {elapsed(order.placedAt, now)}</span>
              </div>
              <ul className="ticket-items">
                {order.items.map((item, index) => (
                  <li key={index}>
                    <b>{item.qty}×</b>
                    <span>{item.name}{item.note ? <em>{item.note}</em> : null}</span>
                  </li>
                ))}
              </ul>
              <button className="primary" onClick={() => onAdvance(order.id)}>
                {order.status === 'paid' ? 'Start preparing' : order.status === 'preparing' ? 'Mark ready' : 'Handed over'}
              </button>
            </article>
          )
        }) : <Empty label="No tickets in the kitchen." />}
      </div>
    </section>
  )
}

function PosScreen({ onCreateOrder }: { onCreateOrder: (order: Order) => void }) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [confirmed, setConfirmed] = useState<string | null>(null)
  const total = useMemo(
    () => menu.reduce((sum, item) => sum + (cart[item.id] || 0) * item.price, 0),
    [cart],
  )

  const charge = (paymentMethod: PaymentMethod) => {
    const items = menu.filter(item => cart[item.id]).map(item => ({ name: item.name, qty: cart[item.id] }))
    const order: Order = {
      id: nextOrderId(),
      customerName: 'Walk-in',
      fulfillment: 'dine_in',
      table: 'Counter',
      amount: total,
      paymentMethod,
      // Staff took the money at the counter, so it goes straight to the kitchen.
      status: 'paid',
      items,
      placedAt: new Date().toISOString(),
    }
    onCreateOrder(order)
    setCart({})
    setConfirmed(order.id)
  }

  return (
    <section>
      <div className="page-heading">
        <div><p className="eyebrow">Walk-in / staff order</p><h1>POS</h1></div>
        <span className="open-badge">Counter</span>
      </div>

      {confirmed && (
        <p className="pos-confirmation" role="status">
          <CheckCircle2 size={16} /> {confirmed} sent to the kitchen.
        </p>
      )}

      <div className="product-grid">
        {menu.map(item => (
          <button
            className={item.available ? 'product-card' : 'product-card unavailable'}
            key={item.id}
            disabled={!item.available}
            onClick={() => setCart(current => ({ ...current, [item.id]: (current[item.id] || 0) + 1 }))}
          >
            <span>{item.category}</span>
            <strong>{item.name}</strong>
            <b>{money(item.price)}</b>
            {cart[item.id] ? <i className="product-qty">{cart[item.id]}</i> : null}
            {!item.available && <i className="product-flag">Sold out</i>}
          </button>
        ))}
      </div>

      <div className="pos-cart">
        <div>
          <span>{Object.values(cart).reduce((a, b) => a + b, 0)} items</span>
          <strong>{money(total)}</strong>
        </div>
        <div className="pos-cart-actions">
          <button className="ghost-clear" disabled={!total} onClick={() => setCart({})}>Clear</button>
          <button className="primary" disabled={!total} onClick={() => charge('cash')}>Charge cash</button>
        </div>
      </div>
    </section>
  )
}

function CustomersScreen({ orders }: { orders: Order[] }) {
  // Loyalty is derived from the order history rather than a separate list, so
  // an order taken today shows up on the customer immediately.
  const customers = useMemo(() => {
    const byName = new Map<string, { name: string; visits: number; spent: number }>()
    for (const order of orders) {
      if (order.status === 'awaiting_payment' || order.customerName === 'Walk-in') continue
      const existing = byName.get(order.customerName) ?? { name: order.customerName, visits: 0, spent: 0 }
      existing.visits += 1
      existing.spent += order.amount
      byName.set(order.customerName, existing)
    }
    return [...byName.values()]
      .map(customer => ({ ...customer, points: Math.floor(customer.spent / 20) }))
      .sort((a, b) => b.spent - a.spent)
  }, [orders])

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">Guest loyalty</p><h1>Customers</h1></div></div>
      <p className="body-copy">1 point for every ₱20 spent. Customers earn without creating an account.</p>
      <div className="customer-list">
        {customers.length ? customers.map(customer => (
          <article key={customer.name}>
            <div className="avatar">{customer.name[0]}</div>
            <div>
              <strong>{customer.name}</strong>
              <span>{customer.visits} {customer.visits === 1 ? 'visit' : 'visits'} · {money(customer.spent)} spent</span>
            </div>
            <b>{customer.points} pts</b>
          </article>
        )) : <Empty label="No customers yet." />}
      </div>
    </section>
  )
}

function ChatScreen({ orders, chat, openOrderId, onSend }: {
  orders: Order[]
  chat: Record<string, ChatMessage[]>
  openOrderId?: string
  onSend: (orderId: string, text: string) => void
}) {
  const [selected, setSelected] = useState<string | undefined>(openOrderId)
  // Counter sales have no customer on the other end of the thread.
  const threads = orders.filter(order => order.status !== 'completed' && order.customerName !== 'Walk-in')

  if (selected) {
    const order = orders.find(item => item.id === selected)
    if (order) {
      return (
        <ChatThread
          order={order}
          messages={chat[order.id] ?? []}
          onSend={text => onSend(order.id, text)}
          onBack={() => setSelected(undefined)}
        />
      )
    }
  }

  return (
    <div className="chat-list-wrap">
      <p className="body-copy chat-intro">
        Chat is attached to an order, so the customer never needs an account to reach the store.
      </p>
      <div className="chat-list">
        {threads.length ? threads.map(order => {
          const messages = chat[order.id] ?? []
          const last = messages.at(-1)
          return (
            <button key={order.id} onClick={() => setSelected(order.id)}>
              <div className="avatar">{order.customerName[0]}</div>
              <div className="chat-list-body">
                <strong>{order.customerName} · {order.id}</strong>
                <span>{last ? last.text : 'No messages yet'}</span>
              </div>
              {last?.from === 'customer' ? <i className="chat-dot" aria-label="Unanswered" /> : null}
            </button>
          )
        }) : <Empty label="No open orders to chat about." />}
      </div>
    </div>
  )
}

const QUICK_REPLIES = ['Ready in 10 minutes.', 'Payment confirmed, salamat!', 'Your order is ready for pick up.']

function ChatThread({ order, messages, onSend, onBack }: {
  order: Order
  messages: ChatMessage[]
  onSend: (text: string) => void
  onBack: () => void
}) {
  const [draft, setDraft] = useState('')

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setDraft('')
  }

  return (
    <div className="chat-thread">
      <div className="chat-thread-head">
        <button className="text-action" onClick={onBack}>← All chats</button>
        <div>
          <strong>{order.customerName} · {order.id}</strong>
          <span>{orderPlace(order)} · {statusLabel[order.status]}</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length ? messages.map(message => (
          <div key={message.id} className={`bubble bubble-${message.from}`}>
            <p>{message.text}</p>
            <time>{clockTime(message.at)}</time>
          </div>
        )) : <p className="body-copy">No messages yet. Say hello to {order.customerName}.</p>}
      </div>

      <div className="quick-replies">
        {QUICK_REPLIES.map(reply => (
          <button key={reply} onClick={() => send(reply)}>{reply}</button>
        ))}
      </div>

      <form
        className="chat-composer"
        onSubmit={event => { event.preventDefault(); send(draft) }}
      >
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder={`Message ${order.customerName}`}
          aria-label="Message"
        />
        <button type="submit" disabled={!draft.trim()} aria-label="Send"><Send size={18} /></button>
      </form>
    </div>
  )
}

function MoreScreen({ unread, onCustomers, onChat, onReset }: {
  unread: number
  onCustomers: () => void
  onChat: () => void
  onReset: () => void
}) {
  const pending = ['Menu & availability', 'QR codes & tables', 'Pickup & delivery', 'Payment methods', 'Loyalty rewards', 'Staff & roles', 'Reports', 'Business settings']

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">ABC Café</p><h1>More</h1></div></div>
      <div className="settings-list">
        <button onClick={onCustomers}>Customers & loyalty<span>›</span></button>
        <button onClick={onChat}>
          Order chat{unread ? <i className="settings-badge">{unread}</i> : null}<span>›</span>
        </button>
        {pending.map(item => (
          <button key={item} className="settings-pending" disabled>
            {item}<i className="soon">Soon</i>
          </button>
        ))}
      </div>
      <div className="free-note">
        <strong>Free for now</strong>
        <p>Unlimited customer orders. One location. Up to 3 staff.</p>
      </div>
      <button className="secondary reset-demo" onClick={onReset}>Reset demo data</button>
    </section>
  )
}

const nextOrderId = () => `#${129 + Math.floor(Math.random() * 200)}`

function GuestOrdering({ chat, onClose, onCreateOrder, onSendMessage }: {
  chat: Record<string, ChatMessage[]>
  onClose: () => void
  onCreateOrder: (order: Order) => void
  onSendMessage: (orderId: string, from: ChatMessage['from'], text: string) => void
}) {
  const [step, setStep] = useState<GuestStep>('name')
  const [name, setName] = useState('')
  const [fulfillment, setFulfillment] = useState<Fulfillment>('dine_in')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [payment, setPayment] = useState<PaymentMethod>('gcash')
  const [placed, setPlaced] = useState<Order | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const total = menu.reduce((sum, item) => sum + (cart[item.id] || 0) * item.price, 0)

  const back = () => {
    if (step === 'name') return onClose()
    setStep(step === 'fulfillment' ? 'name' : step === 'menu' ? 'fulfillment' : step === 'checkout' ? 'menu' : 'checkout')
  }

  const submit = () => {
    const items = menu.filter(item => cart[item.id]).map(item => ({ name: item.name, qty: cart[item.id] }))
    const order: Order = {
      id: nextOrderId(),
      customerName: name.trim() || 'Guest',
      fulfillment,
      table: fulfillment === 'dine_in' ? 'Table 6' : undefined,
      amount: total,
      paymentMethod: payment,
      status: payment === 'cash' ? 'awaiting_payment' : 'payment_review',
      items,
      placedAt: new Date().toISOString(),
    }
    onCreateOrder(order)
    setPlaced(order)
    setStep('tracking')
  }

  if (chatOpen && placed) {
    return (
      <div className="guest-shell">
        <header className="guest-header">
          <button className="icon-button" onClick={() => setChatOpen(false)} aria-label="Back"><ChevronLeft /></button>
          <div><strong>ABC Café</strong><span>Order {placed.id}</span></div>
          <span className="topbar-spacer" />
        </header>
        <main className="guest-content guest-chat">
          <ChatThread
            order={placed}
            messages={chat[placed.id] ?? []}
            onSend={text => onSendMessage(placed.id, 'customer', text)}
            onBack={() => setChatOpen(false)}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="guest-shell">
      <header className="guest-header">
        <button className="icon-button" onClick={back} aria-label="Back"><ChevronLeft /></button>
        <div><strong>ABC Café</strong><span>Masinloc, Zambales</span></div>
        <button
          className="icon-button"
          onClick={() => placed && setChatOpen(true)}
          disabled={!placed}
          aria-label="Chat with store"
        >
          <MessageCircle />
        </button>
      </header>

      <main className="guest-content">
        {step === 'name' && (
          <div className="guest-intro">
            <div className="restaurant-symbol"><Utensils /></div>
            <p>Welcome to ABC Café</p>
            <h1>Order for</h1>
            <input
              autoFocus
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              enterKeyHint="go"
            />
            <button className="primary" disabled={!name.trim()} onClick={() => setStep('fulfillment')}>Continue</button>
            <p className="guest-privacy">No account needed. Your name is only used for this order.</p>
          </div>
        )}

        {step === 'fulfillment' && (
          <div>
            <p className="eyebrow">Hi, {name}</p>
            <h1>How would you like your order?</h1>
            <div className="fulfillment-grid">
              <Choice icon={<Utensils />} title="Dine In" detail="Table 6" active={fulfillment === 'dine_in'} onClick={() => setFulfillment('dine_in')} />
              <Choice icon={<ShoppingBag />} title="Pick Up" detail="Collect at store" active={fulfillment === 'pickup'} onClick={() => setFulfillment('pickup')} />
              <Choice icon={<Bike />} title="Delivery" detail="Store's own rider" active={fulfillment === 'delivery'} onClick={() => setFulfillment('delivery')} />
            </div>
            <button className="primary" onClick={() => setStep('menu')}>Continue to menu</button>
          </div>
        )}

        {step === 'menu' && (
          <div>
            <p className="eyebrow">{fulfillment === 'dine_in' ? 'Dine In · Table 6' : fulfillmentLabel[fulfillment]}</p>
            <h1>What would you like?</h1>
            <div className="menu-list">
              {menu.map(item => (
                <article key={item.id} className={item.available ? undefined : 'sold-out'}>
                  <div>
                    <span>{item.category}</span>
                    <strong>{item.name}</strong>
                    <b>{item.available ? money(item.price) : 'Sold out today'}</b>
                  </div>
                  <div className="qty-control">
                    {cart[item.id] ? (
                      <>
                        <button
                          aria-label={`Remove one ${item.name}`}
                          onClick={() => setCart(current => {
                            const next = { ...current, [item.id]: Math.max(0, (current[item.id] || 0) - 1) }
                            if (!next[item.id]) delete next[item.id]
                            return next
                          })}
                        ><Minus /></button>
                        <strong>{cart[item.id]}</strong>
                      </>
                    ) : null}
                    <button
                      aria-label={`Add one ${item.name}`}
                      disabled={!item.available}
                      onClick={() => setCart(current => ({ ...current, [item.id]: (current[item.id] || 0) + 1 }))}
                    ><Plus /></button>
                  </div>
                </article>
              ))}
            </div>
            {total > 0 && (
              <div className="cart-bar">
                <div>
                  <span>{Object.values(cart).reduce((a, b) => a + b, 0)} items</span>
                  <strong>{money(total)}</strong>
                </div>
                <button onClick={() => setStep('checkout')}>Checkout</button>
              </div>
            )}
          </div>
        )}

        {step === 'checkout' && (
          <div>
            <p className="eyebrow">Payment first</p>
            <h1>Pay {money(total)}</h1>
            <p className="body-copy">
              The money goes directly to ABC Café. For digital payments, the store verifies the payment before the kitchen receives your order.
            </p>
            <div className="payment-list">
              <PaymentChoice label="GCash" value="gcash" current={payment} set={setPayment} />
              <PaymentChoice label="Maya" value="maya" current={payment} set={setPayment} />
              <PaymentChoice label="QR Ph" value="qrph" current={payment} set={setPayment} />
              <PaymentChoice label="Cash at counter" value="cash" current={payment} set={setPayment} />
            </div>
            {payment !== 'cash' && (
              <div className="qr-placeholder">
                <QrCode />
                <strong>ABC Café payment QR</strong>
                <span>Pay the exact amount, then continue.</span>
              </div>
            )}
            <button className="primary" onClick={submit}>
              {payment === 'cash' ? 'Get payment number' : "I've Paid · Confirm Order"}
            </button>
          </div>
        )}

        {step === 'tracking' && (
          <div className="tracking">
            <CheckCircle2 />
            <p>{payment === 'cash' ? 'Pay at the counter to release your order.' : 'Payment sent for verification.'}</p>
            <h1>{payment === 'cash' ? 'Awaiting payment' : 'Verifying payment'}</h1>
            {placed && <p className="tracking-id">Order {placed.id} · {money(placed.amount)}</p>}
            <div className="timeline">
              <span className="done">Order placed</span>
              <span className={payment !== 'cash' ? 'current' : ''}>Payment verified</span>
              <span>Preparing</span>
              <span>Ready</span>
            </div>
            <button className="secondary" onClick={() => setChatOpen(true)}><MessageCircle /> Chat with store</button>
            <button className="text-action" onClick={onClose}>Back to merchant demo</button>
          </div>
        )}
      </main>
    </div>
  )
}

function Choice({ icon, title, detail, active, onClick }: {
  icon: React.ReactNode
  title: string
  detail: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button className={active ? 'choice active' : 'choice'} onClick={onClick} aria-pressed={active}>
      {icon}<strong>{title}</strong><span>{detail}</span>
    </button>
  )
}

function PaymentChoice({ label, value, current, set }: {
  label: string
  value: PaymentMethod
  current: PaymentMethod
  set: (value: PaymentMethod) => void
}) {
  return (
    <button
      className={current === value ? 'payment-option selected' : 'payment-option'}
      onClick={() => set(value)}
      aria-pressed={current === value}
    >
      <CreditCard /><span>{label}</span><i>{current === value ? '✓' : ''}</i>
    </button>
  )
}

function Empty({ label }: { label: string }) {
  return <div className="empty"><ClipboardList /><p>{label}</p></div>
}

export default App
