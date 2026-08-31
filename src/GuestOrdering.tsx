import { useEffect, useMemo, useState } from 'react'
import { Bike, CheckCircle2, ChevronLeft, MessageCircle, Minus, Plus, QrCode, ShoppingBag, Utensils } from 'lucide-react'
import type { Fulfillment, PaymentMethod, PublicMenuProduct } from './lib/posApi'
import { loadGuestTracking, loadStorefront, sendGuestChat, submitGuestOrder, type StorefrontPayload } from './lib/publicPosApi'

const money = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount)
type Step = 'name' | 'fulfillment' | 'menu' | 'checkout' | 'tracking'

export default function GuestOrdering({ slug }: { slug: string }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const table = params.get('table')?.trim() || ''
  const source = params.get('source') === 'marketplace' ? 'marketplace' : 'qr'
  const [payload, setPayload] = useState<StorefrontPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [fulfillment, setFulfillment] = useState<Fulfillment>(table ? 'dine_in' : source === 'marketplace' ? 'pickup' : 'dine_in')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [payment, setPayment] = useState<PaymentMethod | ''>('')
  const [reference, setReference] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [loyalty, setLoyalty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [trackingToken, setTrackingToken] = useState('')
  const [tracking, setTracking] = useState<Awaited<ReturnType<typeof loadGuestTracking>> | null>(null)
  const [chat, setChat] = useState('')

  useEffect(() => {
    let live = true
    loadStorefront(slug).then(data => { if (live) { setPayload(data); setPayment(data.store.payment_methods[0]?.method || '') } }).catch(e => { if (live) setError(e.message) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [slug])

  useEffect(() => {
    if (!trackingToken) return
    let cancelled = false
    const refresh = async () => { try { const next = await loadGuestTracking(trackingToken); if (!cancelled) setTracking(next) } catch { /* retain last known status */ } }
    refresh()
    const timer = window.setInterval(refresh, 8000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [trackingToken])

  const products = payload?.menu.flatMap(category => category.products) || []
  const total = products.reduce((sum, product) => sum + (cart[product.id] || 0) * product.price, 0) + (fulfillment === 'delivery' ? Number(payload?.store.outlet.delivery_fee || 0) : 0)
  const itemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0)
  const selectedPayment = payload?.store.payment_methods.find(method => method.method === payment)
  const digitalPayment = payment !== '' && payment !== 'cash' && payment !== 'card' && payment !== 'room_charge'

  const continueAfterName = () => setStep(table ? 'menu' : 'fulfillment')
  const changeQty = (product: PublicMenuProduct, delta: number) => {
    if (!product.available) return
    setCart(current => ({ ...current, [product.id]: Math.max(0, (current[product.id] || 0) + delta) }))
  }

  const submit = async () => {
    if (!payload || !payment || !itemCount) return
    if (digitalPayment && !selectedPayment?.qr_url) { setError('This digital payment method is not ready yet. Please choose another payment method.'); return }
    if (digitalPayment && !reference.trim()) { setError('Enter the payment reference number after paying.'); return }
    if (fulfillment === 'delivery' && (!phone.trim() || !address.trim())) { setError('Mobile number and delivery address are required for delivery.'); return }
    setSubmitting(true); setError('')
    try {
      const result = await submitGuestOrder({
        slug,
        source,
        fulfillment,
        customerName: name,
        items: Object.entries(cart).filter(([, qty]) => qty > 0).map(([product_id, quantity]) => ({ product_id, quantity })),
        paymentMethod: payment,
        tableLabel: table || undefined,
        customerPhone: phone || undefined,
        deliveryAddress: fulfillment === 'delivery' ? address : undefined,
        deliveryLandmark: fulfillment === 'delivery' ? landmark : undefined,
        paymentReference: reference || undefined,
        loyaltyOptIn: loyalty,
      })
      setTrackingToken(result.tracking_token)
      setStep('tracking')
    } catch (e) { setError(e instanceof Error ? e.message : 'Order failed') }
    finally { setSubmitting(false) }
  }

  if (loading) return <GuestFrame title="Masinloc POS"><div className="center-state"><div className="spinner" /><strong>Loading store…</strong></div></GuestFrame>
  if (error && !payload) return <GuestFrame title="Masinloc POS"><div className="center-state"><QrCode /><h1>Store unavailable</h1><p>{error}</p></div></GuestFrame>
  if (!payload) return null

  return (
    <GuestFrame title={payload.store.name} subtitle={payload.store.outlet.name} onBack={step === 'name' ? undefined : () => setStep(step === 'fulfillment' ? 'name' : step === 'menu' ? (table ? 'name' : 'fulfillment') : step === 'checkout' ? 'menu' : 'tracking')}>
      {error && <div className="inline-error">{error}<button onClick={() => setError('')}>×</button></div>}

      {step === 'name' && <section className="guest-intro"><div className="restaurant-symbol"><Utensils /></div><p>Welcome to {payload.store.name}</p><h1>Order for</h1><input autoFocus value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder="Your name" /><button className="primary" disabled={!name.trim()} onClick={continueAfterName}>Continue</button><small>No account or sign-up required.</small></section>}

      {step === 'fulfillment' && <section><p className="eyebrow">Order for {name}</p><h1>How would you like your order?</h1><div className="fulfillment-grid">
        {payload.store.outlet.dine_in_enabled && source !== 'marketplace' && <Choice icon={<Utensils />} title="Dine In" detail="Eat at the store" active={fulfillment === 'dine_in'} onClick={() => setFulfillment('dine_in')} />}
        {payload.store.outlet.pickup_enabled && <Choice icon={<ShoppingBag />} title="Pick Up" detail="Collect at the store" active={fulfillment === 'pickup'} onClick={() => setFulfillment('pickup')} />}
        {payload.store.outlet.delivery_enabled && <Choice icon={<Bike />} title="Delivery" detail={`Store rider · ${money(Number(payload.store.outlet.delivery_fee))}`} active={fulfillment === 'delivery'} onClick={() => setFulfillment('delivery')} />}
      </div><button className="primary" onClick={() => setStep('menu')}>Continue to Menu</button></section>}

      {step === 'menu' && <section><p className="eyebrow">{fulfillment === 'dine_in' ? `Dine In${table ? ` · ${table}` : ''}` : fulfillment === 'pickup' ? 'Pick Up' : 'Delivery'}</p><h1>What would you like?</h1>{payload.menu.length === 0 ? <Empty title="Menu is not available yet." body="The store has not published products for ordering." /> : payload.menu.map(category => <div key={category.id} className="menu-category"><h2>{category.name}</h2>{category.products.map(product => <article className={!product.available ? 'menu-row unavailable' : 'menu-row'} key={product.id}><div><strong>{product.name}</strong>{product.description && <span>{product.description}</span>}<b>{money(Number(product.price))}</b>{!product.available && <em>Unavailable</em>}</div><div className="qty-control">{cart[product.id] ? <><button onClick={() => changeQty(product, -1)}><Minus /></button><strong>{cart[product.id]}</strong></> : null}<button disabled={!product.available} onClick={() => changeQty(product, 1)}><Plus /></button></div></article>)}</div>)}{itemCount > 0 && <div className="cart-bar"><div><span>{itemCount} item{itemCount === 1 ? '' : 's'}</span><strong>{money(total)}</strong></div><button onClick={() => setStep('checkout')}>Checkout</button></div>}</section>}

      {step === 'checkout' && <section><p className="eyebrow">Payment first</p><h1>Pay {money(total)}</h1><p className="body-copy">Payment goes directly to {payload.store.name}. Digital payments are verified by the store before the order is released to the kitchen.</p>
        {fulfillment === 'delivery' && <div className="form-stack"><label>Mobile number<input inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} /></label><label>Delivery address<textarea value={address} onChange={e => setAddress(e.target.value)} maxLength={500} /></label><label>Landmark <small>optional</small><input value={landmark} onChange={e => setLandmark(e.target.value)} maxLength={300} /></label></div>}
        <div className="payment-list">{payload.store.payment_methods.map(method => <button key={method.id} className={payment === method.method ? 'payment-option selected' : 'payment-option'} onClick={() => { setPayment(method.method); setReference(''); setError('') }}><span>{method.label}</span><i>{payment === method.method ? '✓' : ''}</i></button>)}</div>
        {selectedPayment && digitalPayment && <div className="payment-box">{selectedPayment.qr_url ? <img src={selectedPayment.qr_url} alt={`${selectedPayment.label} payment QR`} /> : <div className="qr-unavailable"><QrCode /><span>QR not configured</span></div>}<strong>{selectedPayment.label}</strong>{selectedPayment.instructions && <p>{selectedPayment.instructions}</p>}<label>Payment reference number<input value={reference} onChange={e => setReference(e.target.value)} maxLength={120} placeholder="Reference number" /></label></div>}
        {payment === 'cash' && <div className="payment-note">Pay at the counter. The kitchen receives the order after the cashier confirms payment.</div>}
        <label className="loyalty-check"><input type="checkbox" checked={loyalty} onChange={e => setLoyalty(e.target.checked)} /><span>Save rewards after this order</span></label>{loyalty && fulfillment !== 'delivery' && <label className="standalone-field">Mobile number<input inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} /></label>}
        <button className="primary" disabled={submitting || !payment || (loyalty && !phone.trim())} onClick={submit}>{submitting ? 'Submitting…' : payment === 'cash' ? 'Confirm Order · Pay at Counter' : "I've Paid · Confirm Order"}</button>
      </section>}

      {step === 'tracking' && <TrackingView tracking={tracking} onSend={async message => { await sendGuestChat(trackingToken, message); setChat(''); setTracking(await loadGuestTracking(trackingToken)) }} chat={chat} setChat={setChat} />}
    </GuestFrame>
  )
}

function GuestFrame({ title, subtitle, children, onBack }: { title: string; subtitle?: string; children: React.ReactNode; onBack?: () => void }) {
  return <div className="guest-shell"><header className="guest-header">{onBack ? <button className="icon-button" onClick={onBack}><ChevronLeft /></button> : <div className="header-spacer" />}<div><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</div><div className="header-spacer" /></header><main className="guest-content">{children}</main></div>
}

function Choice({ icon, title, detail, active, onClick }: { icon: React.ReactNode; title: string; detail: string; active: boolean; onClick: () => void }) {
  return <button className={active ? 'choice active' : 'choice'} onClick={onClick}>{icon}<strong>{title}</strong><span>{detail}</span></button>
}

function Empty({ title, body }: { title: string; body: string }) { return <div className="empty-state"><strong>{title}</strong><p>{body}</p></div> }

function TrackingView({ tracking, onSend, chat, setChat }: { tracking: Awaited<ReturnType<typeof loadGuestTracking>> | null; onSend: (m: string) => Promise<void>; chat: string; setChat: (m: string) => void }) {
  const [sending, setSending] = useState(false)
  if (!tracking) return <div className="center-state"><div className="spinner" /><strong>Loading order status…</strong></div>
  const labels = tracking.fulfillment === 'delivery' ? ['Payment verified', 'Preparing', 'Ready', 'Out for delivery', 'Completed'] : ['Payment verified', 'Preparing', 'Ready', 'Completed']
  const rank: Record<string, number> = { awaiting_payment: -1, payment_review: -1, paid: 0, preparing: 1, ready: 2, out_for_delivery: 3, completed: tracking.fulfillment === 'delivery' ? 4 : 3 }
  const paid = tracking.payment_status === 'paid'
  const closed = tracking.status === 'completed' || tracking.status === 'cancelled'
  return <section className="tracking"><CheckCircle2 /><p>Order #{tracking.order_number}</p><h1>{tracking.status.replaceAll('_', ' ')}</h1><div className="timeline">{labels.map((label, index) => <span key={label} className={index <= (rank[tracking.status] ?? -1) ? 'done' : ''}>{label}</span>)}</div>{paid ? <div className="chat-box"><div className="section-title"><h2>Message store</h2><MessageCircle /></div><div className="chat-history">{tracking.messages.length ? tracking.messages.map((m, index) => <p key={`${m.created_at}-${index}`} className={`chat-${m.sender_type}`}><b>{m.sender_type === 'customer' ? 'You' : m.sender_type === 'staff' ? 'Store' : 'Update'}</b>{m.message}</p>) : <span>No messages yet.</span>}</div>{closed ? <div className="payment-note">This order message thread is closed.</div> : <div className="chat-compose"><input value={chat} onChange={e => setChat(e.target.value)} maxLength={1000} placeholder="Message about this order" /><button disabled={sending || !chat.trim()} onClick={async () => { setSending(true); try { await onSend(chat.trim()) } finally { setSending(false) } }}>Send</button></div>}</div> : <div className="payment-note">Messaging becomes available after the store confirms payment.</div>}</section>
}
