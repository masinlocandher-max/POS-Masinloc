import { useMemo, useState } from 'react'
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
  ShoppingBag,
  Store,
  Users,
  Utensils,
} from 'lucide-react'
import type { Fulfillment, Order, OrderStatus, PaymentMethod } from './domain'
import { money } from './domain'
import { menu, seedOrders } from './mockData'

type MerchantTab = 'home' | 'orders' | 'pos' | 'customers' | 'more'
type GuestStep = 'name' | 'fulfillment' | 'menu' | 'checkout' | 'tracking'

const statusLabel: Record<OrderStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  payment_review: 'Verify payment',
  paid: 'Paid',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
}

const nextStatus = (status: OrderStatus): OrderStatus => {
  if (status === 'payment_review') return 'paid'
  if (status === 'paid') return 'preparing'
  if (status === 'preparing') return 'ready'
  if (status === 'ready') return 'completed'
  return status
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
  const [orders, setOrders] = useState<Order[]>(seedOrders)

  const updateStatus = (id: string) => {
    setOrders(current => current.map(order => order.id === id ? { ...order, status: nextStatus(order.status) } : order))
  }

  if (mode === 'guest') {
    return <GuestOrdering onClose={() => setMode('merchant')} onCreateOrder={order => setOrders(current => [order, ...current])} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <button className="ghost-action" onClick={() => setMode('guest')}><QrCode size={18} /> Guest demo</button>
      </header>

      <main className="content">
        {tab === 'home' && <HomeScreen orders={orders} setTab={setTab} />}
        {tab === 'orders' && <OrdersScreen orders={orders} onAdvance={updateStatus} />}
        {tab === 'pos' && <PosScreen />}
        {tab === 'customers' && <CustomersScreen />}
        {tab === 'more' && <MoreScreen />}
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        <NavButton active={tab === 'home'} icon={<Home />} label="Home" onClick={() => setTab('home')} />
        <NavButton active={tab === 'orders'} icon={<ClipboardList />} label="Orders" onClick={() => setTab('orders')} />
        <NavButton active={tab === 'pos'} icon={<Store />} label="POS" onClick={() => setTab('pos')} />
        <NavButton active={tab === 'customers'} icon={<Users />} label="Customers" onClick={() => setTab('customers')} />
        <NavButton active={tab === 'more'} icon={<MenuIcon />} label="More" onClick={() => setTab('more')} />
      </nav>
    </div>
  )
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? 'nav-button active' : 'nav-button'} onClick={onClick}>{icon}<span>{label}</span></button>
}

function HomeScreen({ orders, setTab }: { orders: Order[]; setTab: (tab: MerchantTab) => void }) {
  const attention = orders.filter(o => ['payment_review', 'paid', 'preparing', 'ready'].includes(o.status))
  const sales = orders.filter(o => o.status !== 'awaiting_payment').reduce((sum, order) => sum + order.amount, 0)

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">ABC Café · Masinloc</p><h1>Good afternoon.</h1></div><span className="open-badge">Open</span></div>
      <div className="metric-strip">
        <div><span>Sales today</span><strong>{money(sales)}</strong></div>
        <div><span>Orders</span><strong>{orders.length}</strong></div>
        <div><span>Needs attention</span><strong>{attention.length}</strong></div>
      </div>
      <div className="section-title"><h2>Needs attention</h2><button onClick={() => setTab('orders')}>See all</button></div>
      <div className="order-stack">
        {attention.slice(0, 3).map(order => <OrderCard key={order.id} order={order} />)}
      </div>
      <div className="quick-grid">
        <button onClick={() => setTab('pos')}><Store /><span><strong>New sale</strong><small>Open POS</small></span></button>
        <button onClick={() => setTab('orders')}><ChefHat /><span><strong>Kitchen</strong><small>Active orders</small></span></button>
        <button><QrCode /><span><strong>Table QR</strong><small>Manage codes</small></span></button>
        <button><MessageCircle /><span><strong>Messages</strong><small>Order chats</small></span></button>
      </div>
    </section>
  )
}

function OrderCard({ order, onAdvance }: { order: Order; onAdvance?: (id: string) => void }) {
  const place = order.fulfillment === 'dine_in' ? order.table : order.fulfillment === 'pickup' ? 'Pick up' : 'Delivery'
  return (
    <article className="order-card">
      <div className="order-card-top"><div><strong>{order.id} · {order.customerName}</strong><span>{place} · {order.createdAt}</span></div><span className={`status status-${order.status}`}>{statusLabel[order.status]}</span></div>
      <div className="order-items">{order.items.map((item, index) => <p key={index}>{item.qty}× {item.name}{item.note ? <small>{item.note}</small> : null}</p>)}</div>
      <div className="order-bottom"><strong>{money(order.amount)}</strong><span>{order.paymentMethod.toUpperCase()}</span></div>
      {onAdvance && ['payment_review', 'paid', 'preparing', 'ready'].includes(order.status) && (
        <button className="primary small" onClick={() => onAdvance(order.id)}>
          {order.status === 'payment_review' ? 'Confirm payment' : order.status === 'paid' ? 'Send to kitchen' : order.status === 'preparing' ? 'Mark ready' : 'Complete order'}
        </button>
      )}
    </article>
  )
}

function OrdersScreen({ orders, onAdvance }: { orders: Order[]; onAdvance: (id: string) => void }) {
  const [filter, setFilter] = useState<'active' | 'payment' | 'ready' | 'done'>('active')
  const visible = orders.filter(order => {
    if (filter === 'payment') return order.status === 'payment_review'
    if (filter === 'ready') return order.status === 'ready'
    if (filter === 'done') return order.status === 'completed'
    return ['paid', 'preparing'].includes(order.status)
  })
  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">Operations</p><h1>Orders</h1></div></div>
      <div className="segmented">
        <button className={filter === 'active' ? 'selected' : ''} onClick={() => setFilter('active')}>Active</button>
        <button className={filter === 'payment' ? 'selected' : ''} onClick={() => setFilter('payment')}>Payments</button>
        <button className={filter === 'ready' ? 'selected' : ''} onClick={() => setFilter('ready')}>Ready</button>
        <button className={filter === 'done' ? 'selected' : ''} onClick={() => setFilter('done')}>Done</button>
      </div>
      <div className="order-stack">{visible.length ? visible.map(order => <OrderCard key={order.id} order={order} onAdvance={onAdvance} />) : <Empty label="No orders here." />}</div>
    </section>
  )
}

function PosScreen() {
  const [cart, setCart] = useState<Record<string, number>>({})
  const total = useMemo(() => menu.reduce((sum, item) => sum + (cart[item.id] || 0) * item.price, 0), [cart])
  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">Walk-in / staff order</p><h1>POS</h1></div><span className="open-badge">Counter</span></div>
      <div className="product-grid">{menu.map(item => <button className="product-card" key={item.id} onClick={() => setCart(c => ({ ...c, [item.id]: (c[item.id] || 0) + 1 }))}><span>{item.category}</span><strong>{item.name}</strong><b>{money(item.price)}</b></button>)}</div>
      <div className="pos-cart"><div><span>Current sale</span><strong>{money(total)}</strong></div><button className="primary" disabled={!total}>Review sale</button></div>
    </section>
  )
}

function CustomersScreen() {
  const customers = [
    { name: 'Francine', visits: 11, spent: 8460, points: 132 },
    { name: 'Mika', visits: 5, spent: 2780, points: 84 },
    { name: 'Ana', visits: 3, spent: 1590, points: 39 },
  ]
  return <section><div className="page-heading"><div><p className="eyebrow">Guest loyalty</p><h1>Customers</h1></div></div><div className="customer-list">{customers.map(c => <article key={c.name}><div className="avatar">{c.name[0]}</div><div><strong>{c.name}</strong><span>{c.visits} visits · {money(c.spent)} spent</span></div><b>{c.points} pts</b></article>)}</div></section>
}

function MoreScreen() {
  const items = ['Menu & availability', 'QR codes & tables', 'Pickup & delivery', 'Payment methods', 'Loyalty rewards', 'Staff & roles', 'Reports', 'Business settings']
  return <section><div className="page-heading"><div><p className="eyebrow">ABC Café</p><h1>More</h1></div></div><div className="settings-list">{items.map(item => <button key={item}>{item}<span>›</span></button>)}</div><div className="free-note"><strong>Free for now</strong><p>Unlimited customer orders. One location. Up to 3 staff.</p></div></section>
}

function GuestOrdering({ onClose, onCreateOrder }: { onClose: () => void; onCreateOrder: (order: Order) => void }) {
  const [step, setStep] = useState<GuestStep>('name')
  const [name, setName] = useState('')
  const [fulfillment, setFulfillment] = useState<Fulfillment>('dine_in')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [payment, setPayment] = useState<PaymentMethod>('gcash')
  const total = menu.reduce((sum, item) => sum + (cart[item.id] || 0) * item.price, 0)

  const submit = () => {
    const items = menu.filter(i => cart[i.id]).map(i => ({ name: i.name, qty: cart[i.id] }))
    onCreateOrder({ id: `#${129 + Math.floor(Math.random() * 20)}`, customerName: name || 'Guest', fulfillment, table: fulfillment === 'dine_in' ? 'Table 6' : undefined, amount: total, paymentMethod: payment, status: payment === 'cash' ? 'awaiting_payment' : 'payment_review', items, createdAt: 'Just now' })
    setStep('tracking')
  }

  return (
    <div className="guest-shell">
      <header className="guest-header"><button className="icon-button" onClick={step === 'name' ? onClose : () => setStep(step === 'fulfillment' ? 'name' : step === 'menu' ? 'fulfillment' : step === 'checkout' ? 'menu' : 'checkout')}><ChevronLeft /></button><div><strong>ABC Café</strong><span>Masinloc, Zambales</span></div><button className="icon-button"><MessageCircle /></button></header>
      <main className="guest-content">
        {step === 'name' && <div className="guest-intro"><div className="restaurant-symbol"><Utensils /></div><p>Welcome to ABC Café</p><h1>Order for</h1><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /><button className="primary" disabled={!name.trim()} onClick={() => setStep('fulfillment')}>Continue</button></div>}
        {step === 'fulfillment' && <div><p className="eyebrow">Hi, {name}</p><h1>How would you like your order?</h1><div className="fulfillment-grid"><Choice icon={<Utensils />} title="Dine In" detail="Table 6" active={fulfillment === 'dine_in'} onClick={() => setFulfillment('dine_in')} /><Choice icon={<ShoppingBag />} title="Pick Up" detail="Collect at store" active={fulfillment === 'pickup'} onClick={() => setFulfillment('pickup')} /><Choice icon={<Bike />} title="Delivery" detail="Store's own rider" active={fulfillment === 'delivery'} onClick={() => setFulfillment('delivery')} /></div><button className="primary" onClick={() => setStep('menu')}>Continue to menu</button></div>}
        {step === 'menu' && <div><p className="eyebrow">{fulfillment === 'dine_in' ? 'Dine In · Table 6' : fulfillment === 'pickup' ? 'Pick Up' : 'Delivery'}</p><h1>What would you like?</h1><div className="menu-list">{menu.map(item => <article key={item.id}><div><span>{item.category}</span><strong>{item.name}</strong><b>{money(item.price)}</b></div><div className="qty-control">{cart[item.id] ? <><button onClick={() => setCart(c => ({ ...c, [item.id]: Math.max(0, (c[item.id] || 0) - 1) }))}><Minus /></button><strong>{cart[item.id]}</strong></> : null}<button onClick={() => setCart(c => ({ ...c, [item.id]: (c[item.id] || 0) + 1 }))}><Plus /></button></div></article>)}</div>{total > 0 && <div className="cart-bar"><div><span>{Object.values(cart).reduce((a, b) => a + b, 0)} items</span><strong>{money(total)}</strong></div><button onClick={() => setStep('checkout')}>Checkout</button></div>}</div>}
        {step === 'checkout' && <div><p className="eyebrow">Payment first</p><h1>Pay {money(total)}</h1><p className="body-copy">The money goes directly to ABC Café. For digital payments, the store verifies the payment before the kitchen receives your order.</p><div className="payment-list"><PaymentChoice label="GCash" value="gcash" current={payment} set={setPayment} /><PaymentChoice label="Maya" value="maya" current={payment} set={setPayment} /><PaymentChoice label="QR Ph" value="qrph" current={payment} set={setPayment} /><PaymentChoice label="Cash at counter" value="cash" current={payment} set={setPayment} /></div>{payment !== 'cash' && <div className="qr-placeholder"><QrCode /><strong>ABC Café payment QR</strong><span>Pay the exact amount, then continue.</span></div>}<button className="primary" onClick={submit}>{payment === 'cash' ? 'Get payment number' : "I've Paid · Confirm Order"}</button></div>}
        {step === 'tracking' && <div className="tracking"><CheckCircle2 /><p>{payment === 'cash' ? 'Pay at the counter to release your order.' : 'Payment sent for verification.'}</p><h1>{payment === 'cash' ? 'Awaiting payment' : 'Verifying payment'}</h1><div className="timeline"><span className="done">Order placed</span><span className={payment !== 'cash' ? 'current' : ''}>Payment verified</span><span>Preparing</span><span>Ready</span></div><button className="secondary"><MessageCircle /> Chat with store</button><button className="text-action" onClick={onClose}>Back to merchant demo</button></div>}
      </main>
    </div>
  )
}

function Choice({ icon, title, detail, active, onClick }: { icon: React.ReactNode; title: string; detail: string; active: boolean; onClick: () => void }) {
  return <button className={active ? 'choice active' : 'choice'} onClick={onClick}>{icon}<strong>{title}</strong><span>{detail}</span></button>
}

function PaymentChoice({ label, value, current, set }: { label: string; value: PaymentMethod; current: PaymentMethod; set: (v: PaymentMethod) => void }) {
  return <button className={current === value ? 'payment-option selected' : 'payment-option'} onClick={() => set(value)}><CreditCard /><span>{label}</span><i>{current === value ? '✓' : ''}</i></button>
}

function Empty({ label }: { label: string }) { return <div className="empty"><ClipboardList /><p>{label}</p></div> }

export default App
