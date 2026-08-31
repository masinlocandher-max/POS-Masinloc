import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Archive, BadgeCheck, Banknote, Boxes, ChefHat, ClipboardList, Clock3, Home, LogIn, LogOut, Menu as MenuIcon, Minus, PackagePlus, Plus, RefreshCw, ShieldCheck, ShoppingCart, Store, Users, WalletCards } from 'lucide-react'
import { supabase } from './lib/supabase'
import MarketplaceProfileTool from './MarketplaceProfileTool'
import {
  advanceOrder,
  archiveProduct,
  authApi,
  cancelUnpaidOrder,
  confirmPayment,
  createCategory,
  createProduct,
  createStaffOrder,
  getCatalog,
  getCustomers,
  getDashboard,
  getMerchantContexts,
  getOrders,
  getPlanLimits,
  recordInventoryMovement,
  setProductAvailability,
  subscribeToOrders,
  type CategoryRow,
  type CustomerRow,
  type DashboardData,
  type Fulfillment,
  type MerchantContext,
  type OrderRow,
  type OrderStatus,
  type PaymentMethod,
  type PlanLimits,
  type ProductRow,
} from './lib/posApi'
import {
  clockIn,
  clockOut,
  closeCashSession,
  createExpense,
  getAttendance,
  getAuditTrail,
  getCashSessions,
  getExpenses,
  getPaymentMethods,
  openCashSession,
  upsertPaymentMethod,
  type AttendanceRow,
  type AuditRow,
  type CashSessionRow,
  type ExpenseRow,
  type PaymentMethodRow,
} from './lib/opsApi'
import { uploadPaymentQr } from './lib/paymentAssetApi'

type Tab = 'home' | 'orders' | 'pos' | 'customers' | 'more'
type Tool = 'overview' | 'marketplace' | 'catalog' | 'payments' | 'expenses' | 'cash' | 'attendance' | 'audit'
const money = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount || 0)
const statusLabel: Record<OrderStatus, string> = { parked: 'Parked', awaiting_payment: 'Awaiting payment', payment_review: 'Verify payment', paid: 'Paid', preparing: 'Preparing', ready: 'Ready', out_for_delivery: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled' }

export default function MerchantApp() {
  const [tab, setTab] = useState<Tab>('home')
  const [tool, setTool] = useState<Tool>('overview')
  const [booting, setBooting] = useState(true)
  const [session, setSession] = useState(false)
  const [contexts, setContexts] = useState<MerchantContext[]>([])
  const [context, setContext] = useState<MerchantContext | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [payments, setPayments] = useState<PaymentMethodRow[]>([])
  const [plan, setPlan] = useState<PlanLimits | null>(null)
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [cashSessions, setCashSessions] = useState<CashSessionRow[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showSignIn, setShowSignIn] = useState(false)

  const loadMerchant = async (next: MerchantContext) => {
    if (!next.outlet_id) throw new Error('This business has no active outlet configured.')
    setContext(next)
    const [d, o, catalog, c, p, limits] = await Promise.all([
      getDashboard(next.merchant_id, next.outlet_id),
      getOrders(next.merchant_id),
      getCatalog(next.merchant_id),
      getCustomers(next.merchant_id),
      getPaymentMethods(next.merchant_id, next.outlet_id),
      getPlanLimits(next.plan_code),
    ])
    setDashboard(d); setOrders(o); setCategories(catalog.categories); setProducts(catalog.products); setCustomers(c); setPayments(p); setPlan(limits)
  }

  const boot = async () => {
    setBooting(true); setError('')
    try {
      const current = await authApi.session()
      setSession(Boolean(current))
      if (!current) { setContexts([]); setContext(null); return }
      const nextContexts = await getMerchantContexts()
      setContexts(nextContexts)
      if (nextContexts.length) await loadMerchant(nextContexts[0])
      else setContext(null)
    } catch (e) { setError(messageOf(e)) }
    finally { setBooting(false) }
  }

  const refreshCore = async () => { if (context) await loadMerchant(context) }

  useEffect(() => { boot(); const { data } = supabase.auth.onAuthStateChange(() => void boot()); return () => data.subscription.unsubscribe() }, [])
  useEffect(() => { if (!context) return; const channel = subscribeToOrders(context.merchant_id, () => void refreshCore()); return () => { void supabase.removeChannel(channel) } }, [context?.merchant_id])

  const loadTool = async (next: Tool) => {
    setTool(next); setError('')
    if (!context?.outlet_id) return
    try {
      if (next === 'expenses') setExpenses(await getExpenses(context.merchant_id))
      if (next === 'cash') setCashSessions(await getCashSessions(context.merchant_id, context.outlet_id))
      if (next === 'attendance') setAttendance(await getAttendance(context.merchant_id))
      if (next === 'audit') setAudit(await getAuditTrail(context.merchant_id))
    } catch (e) { setError(messageOf(e)) }
  }

  if (booting) return <div className="app-shell"><div className="center-state full"><div className="spinner" /><strong>Connecting to Masinloc POS…</strong></div></div>

  const reviewMode = !session
  const noMerchant = session && !context
  return <div className="app-shell">
    <header className="topbar"><Brand /><div className="top-actions">{context && <span className="role-pill">{context.role}</span>}{reviewMode ? <button className="ghost-action" onClick={() => setShowSignIn(true)}><LogIn /> Sign in</button> : <button className="icon-button" title="Sign out" onClick={() => void authApi.signOut()}><LogOut /></button>}</div></header>
    {reviewMode && <div className="review-banner"><ShieldCheck /><div><strong>Review mode · Supabase connected</strong><span>No merchant, sales, products, orders, or customer records are being fabricated for this preview.</span></div></div>}
    {noMerchant && <div className="review-banner warning"><BadgeCheck /><div><strong>No approved POS business is linked to this account.</strong><span>The operational app remains locked to real merchant memberships.</span></div></div>}
    {error && <div className="inline-error app-error">{error}<button onClick={() => setError('')}>×</button></div>}
    {notice && <div className="inline-notice">{notice}<button onClick={() => setNotice('')}>×</button></div>}

    <main className="content">
      {tab === 'home' && <HomeScreen context={context} dashboard={dashboard} orders={orders} reviewMode={reviewMode || noMerchant} setTab={setTab} />}
      {tab === 'orders' && <OrdersScreen orders={orders} disabled={!context} onAction={async (order, action) => { try { setError(''); if (action === 'confirm') { const pending = order.pos_payments.find(p => p.status === 'pending'); const needsRef = pending && !['cash','card','room_charge'].includes(pending.method); let ref = pending?.reference_number || ''; if (needsRef && !ref) ref = window.prompt('Payment reference number')?.trim() || ''; if (needsRef && !ref) return; await confirmPayment(order.id, ref || undefined) } else if (action === 'cancel') { const reason = window.prompt('Reason for cancellation')?.trim(); if (!reason) return; await cancelUnpaidOrder(order.id, reason) } else await advanceOrder(order.id, action); await refreshCore() } catch (e) { setError(messageOf(e)) } }} />}
      {tab === 'pos' && <PosScreen context={context} products={products} categories={categories} payments={payments} onComplete={async () => { await refreshCore(); setTab('orders') }} onError={setError} />}
      {tab === 'customers' && <CustomersScreen customers={customers} disabled={!context} />}
      {tab === 'more' && <MoreScreen context={context} tool={tool} loadTool={loadTool} plan={plan} products={products} categories={categories} payments={payments} expenses={expenses} cashSessions={cashSessions} attendance={attendance} audit={audit} onRefresh={refreshCore} setProducts={setProducts} setCategories={setCategories} setPayments={setPayments} setExpenses={setExpenses} setCashSessions={setCashSessions} setAttendance={setAttendance} setAudit={setAudit} onError={setError} onNotice={setNotice} />}
    </main>

    <nav className="bottom-nav"><Nav active={tab === 'home'} icon={<Home />} label="Home" onClick={() => setTab('home')} /><Nav active={tab === 'orders'} icon={<ClipboardList />} label="Orders" onClick={() => setTab('orders')} /><Nav active={tab === 'pos'} icon={<Store />} label="POS" onClick={() => setTab('pos')} /><Nav active={tab === 'customers'} icon={<Users />} label="Customers" onClick={() => setTab('customers')} /><Nav active={tab === 'more'} icon={<MenuIcon />} label="More" onClick={() => setTab('more')} /></nav>
    {showSignIn && <SignIn onClose={() => setShowSignIn(false)} onError={setError} />}
  </div>
}

function Brand() { return <div className="brand"><div className="brand-mark"><span /><span /><span /><span /></div><div><strong>MASINLOC</strong><small>POS · ZAMBALES</small></div></div> }
function Nav({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button className={active ? 'nav-button active' : 'nav-button'} onClick={onClick}>{icon}<span>{label}</span></button> }

function HomeScreen({ context, dashboard, orders, reviewMode, setTab }: { context: MerchantContext | null; dashboard: DashboardData | null; orders: OrderRow[]; reviewMode: boolean; setTab: (t: Tab) => void }) {
  const attention = orders.filter(o => ['payment_review','paid','preparing','ready','out_for_delivery'].includes(o.status))
  return <section><div className="page-heading"><div><p className="eyebrow">{context ? `${context.merchant_name} · ${context.outlet_name || 'Main'}` : 'Masinloc POS'}</p><h1>{context ? 'Operations' : 'Product review'}</h1></div>{context && <span className="open-badge">Live</span>}</div><div className="metric-strip"><Metric label="Sales today" value={money(dashboard?.sales_today || 0)} /><Metric label="Orders" value={String(dashboard?.orders_today || 0)} /><Metric label="Needs attention" value={String((dashboard?.payment_review || 0) + (dashboard?.active_orders || 0))} /></div><div className="section-title"><h2>Needs attention</h2><button onClick={() => setTab('orders')}>See all</button></div>{attention.length ? <div className="order-stack">{attention.slice(0,3).map(o => <OrderCard key={o.id} order={o} />)}</div> : <Empty icon={<ClipboardList />} title={reviewMode ? 'No demo orders.' : 'Nothing needs attention.'} body={reviewMode ? 'Real orders will appear here after a verified business starts using the system.' : 'Payment reviews and active kitchen orders appear here automatically.'} />}<div className="quick-grid"><button onClick={() => setTab('pos')}><ShoppingCart /><span><strong>New Sale</strong><small>Open POS</small></span></button><button onClick={() => setTab('orders')}><ChefHat /><span><strong>Kitchen</strong><small>Live queue</small></span></button><button onClick={() => setTab('more')}><Boxes /><span><strong>Inventory</strong><small>Stock & products</small></span></button><button onClick={() => setTab('more')}><ShieldCheck /><span><strong>Audit</strong><small>Operational controls</small></span></button></div></section>
}
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div> }

function OrdersScreen({ orders, disabled, onAction }: { orders: OrderRow[]; disabled: boolean; onAction: (o: OrderRow, action: OrderStatus | 'confirm' | 'cancel') => Promise<void> }) {
  const [filter, setFilter] = useState<'active'|'payment'|'ready'|'done'>('active')
  const visible = orders.filter(o => filter === 'payment' ? ['awaiting_payment','payment_review'].includes(o.status) : filter === 'ready' ? ['ready','out_for_delivery'].includes(o.status) : filter === 'done' ? ['completed','cancelled'].includes(o.status) : ['paid','preparing'].includes(o.status))
  return <section><div className="page-heading"><div><p className="eyebrow">Realtime</p><h1>Orders</h1></div></div><div className="segmented"><button className={filter==='active'?'selected':''} onClick={() => setFilter('active')}>Active</button><button className={filter==='payment'?'selected':''} onClick={() => setFilter('payment')}>Payments</button><button className={filter==='ready'?'selected':''} onClick={() => setFilter('ready')}>Ready</button><button className={filter==='done'?'selected':''} onClick={() => setFilter('done')}>Done</button></div>{visible.length ? <div className="order-stack">{visible.map(order => <OrderCard key={order.id} order={order} onAction={disabled ? undefined : onAction} />)}</div> : <Empty icon={<ClipboardList />} title="No orders here." body="This queue uses stored Supabase transactions only." />}</section>
}

function OrderCard({ order, onAction }: { order: OrderRow; onAction?: (o: OrderRow, action: OrderStatus|'confirm'|'cancel') => Promise<void> }) {
  const place = order.fulfillment === 'dine_in' ? order.table_label || 'Dine in' : order.fulfillment === 'pickup' ? 'Pick up' : 'Delivery'
  const pendingPayment = order.pos_payments.find(p => p.status === 'pending')
  let action: OrderStatus|'confirm'|null = null; let label=''
  if (['awaiting_payment','payment_review'].includes(order.status)) { action='confirm'; label='Confirm payment' }
  else if (order.status==='paid') { action='preparing'; label='Send to kitchen' }
  else if (order.status==='preparing') { action='ready'; label='Mark ready' }
  else if (order.status==='ready') { action=order.fulfillment==='delivery'?'out_for_delivery':'completed'; label=order.fulfillment==='delivery'?'Out for delivery':'Complete order' }
  else if (order.status==='out_for_delivery') { action='completed'; label='Delivered' }
  return <article className="order-card"><div className="order-card-top"><div><strong>#{order.order_number} · {order.customer_name}</strong><span>{place} · {relativeTime(order.created_at)}</span></div><span className={`status status-${order.status}`}>{statusLabel[order.status]}</span></div><div className="order-items">{order.pos_order_items.map(item => <p key={item.id}>{item.quantity}× {item.product_name}{item.note && <small>{item.note}</small>}</p>)}</div>{pendingPayment?.reference_number && <div className="reference-row">Ref: {pendingPayment.reference_number}</div>}<div className="order-bottom"><strong>{money(Number(order.total))}</strong><span>{pendingPayment?.method?.toUpperCase() || order.payment_status.toUpperCase()}</span></div>{onAction && action && <div className="order-actions"><button className="primary small" onClick={() => void onAction(order, action!)}>{label}</button>{['awaiting_payment','payment_review'].includes(order.status) && <button className="secondary small" onClick={() => void onAction(order,'cancel')}>Cancel</button>}</div>}</article>
}

function PosScreen({ context, products, categories, payments, onComplete, onError }: { context: MerchantContext|null; products: ProductRow[]; categories: CategoryRow[]; payments: PaymentMethodRow[]; onComplete: () => Promise<void>; onError: (m:string)=>void }) {
  const [cart,setCart]=useState<Record<string,number>>({}); const [customer,setCustomer]=useState(''); const [fulfillment,setFulfillment]=useState<Fulfillment>('dine_in'); const [table,setTable]=useState(''); const [payment,setPayment]=useState<PaymentMethod|''>(payments.find(p=>p.enabled)?.method||''); const [busy,setBusy]=useState(false)
  useEffect(()=>{if(!payment)setPayment(payments.find(p=>p.enabled)?.method||'')},[payments,payment])
  const activeProducts=products.filter(p=>p.active && (!p.track_inventory || p.stock_on_hand>0)); const total=activeProducts.reduce((s,p)=>s+(cart[p.id]||0)*Number(p.price),0); const qty=Object.values(cart).reduce((a,b)=>a+b,0)
  const submit=async(park=false)=>{if(!context?.outlet_id||!customer.trim()||!qty||( !park && !payment))return;setBusy(true);try{await createStaffOrder({merchantId:context.merchant_id,outletId:context.outlet_id,fulfillment,customerName:customer,items:Object.entries(cart).filter(([,q])=>q>0).map(([product_id,quantity])=>({product_id,quantity})),paymentMethod:(payment||'cash') as PaymentMethod,tableLabel:table||undefined,park});setCart({});setCustomer('');await onComplete()}catch(e){onError(messageOf(e))}finally{setBusy(false)}}
  return <section><div className="page-heading"><div><p className="eyebrow">Staff order</p><h1>POS</h1></div><span className="open-badge">{context?'Live':'Review'}</span></div>{!context && <Empty icon={<Store />} title="No merchant data loaded." body="Sign in to an approved business to use POS. Review mode never invents products." />}{context && <><div className="pos-fields"><input placeholder="Order for / customer name" value={customer} maxLength={120} onChange={e=>setCustomer(e.target.value)}/><select value={fulfillment} onChange={e=>setFulfillment(e.target.value as Fulfillment)}><option value="dine_in">Dine In</option><option value="pickup">Pick Up</option><option value="delivery">Delivery</option></select>{fulfillment==='dine_in'&&<input placeholder="Table (optional)" value={table} maxLength={80} onChange={e=>setTable(e.target.value)}/>}</div>{products.length===0?<Empty icon={<Boxes />} title="No products yet." body="Add real products in More → Catalog before taking a sale." />:<><div className="category-labels">{categories.map(c=><span key={c.id}>{c.name}</span>)}</div><div className="product-grid">{products.map(p=><button disabled={!p.active||(p.track_inventory&&p.stock_on_hand<=0)} className="product-card" key={p.id} onClick={()=>setCart(c=>({...c,[p.id]:(c[p.id]||0)+1}))}><span>{categories.find(c=>c.id===p.category_id)?.name||'Uncategorized'}</span><strong>{p.name}</strong><b>{money(Number(p.price))}</b>{p.track_inventory&&<small>{p.stock_on_hand} in stock</small>}</button>)}</div></>}{qty>0&&<div className="pos-cart"><div><span>{qty} items</span><strong>{money(total)}</strong></div><select value={payment} onChange={e=>setPayment(e.target.value as PaymentMethod)}><option value="">Payment</option>{payments.filter(p=>p.enabled).map(p=><option key={p.id} value={p.method}>{p.label}</option>)}</select><button disabled={busy||!customer.trim()} onClick={()=>void submit(true)}>Park</button><button className="primary" disabled={busy||!customer.trim()||!payment} onClick={()=>void submit(false)}>Create order</button></div>}</>}</section>
}

function CustomersScreen({ customers, disabled }: { customers: CustomerRow[]; disabled: boolean }) { return <section><div className="page-heading"><div><p className="eyebrow">Guest loyalty</p><h1>Customers</h1></div></div>{customers.length?<div className="customer-list">{customers.map(c=><article key={c.id}><div className="avatar">{(c.display_name||'?')[0].toUpperCase()}</div><div><strong>{c.display_name||'Guest'}</strong><span>{c.visit_count} visits · {money(Number(c.lifetime_spend))} spent{c.phone?` · ${c.phone}`:''}</span></div><b>{c.points_balance} pts</b></article>)}</div>:<Empty icon={<Users />} title={disabled?'No customer data in review mode.':'No loyalty customers yet.'} body="Customer records are created only from real orders when a phone number is provided." />}</section> }

function MoreScreen(props:{context:MerchantContext|null;tool:Tool;loadTool:(t:Tool)=>Promise<void>;plan:PlanLimits|null;products:ProductRow[];categories:CategoryRow[];payments:PaymentMethodRow[];expenses:ExpenseRow[];cashSessions:CashSessionRow[];attendance:AttendanceRow[];audit:AuditRow[];onRefresh:()=>Promise<void>;setProducts:(v:ProductRow[])=>void;setCategories:(v:CategoryRow[])=>void;setPayments:(v:PaymentMethodRow[])=>void;setExpenses:(v:ExpenseRow[])=>void;setCashSessions:(v:CashSessionRow[])=>void;setAttendance:(v:AttendanceRow[])=>void;setAudit:(v:AuditRow[])=>void;onError:(m:string)=>void;onNotice:(m:string)=>void}) {
  const {context,tool,loadTool,plan,products,categories,payments,expenses,cashSessions,attendance,audit,onRefresh,setProducts,setCategories,setPayments,setExpenses,setCashSessions,setAttendance,setAudit,onError,onNotice}=props
  if(tool!=='overview') return <ToolScreen title={tool} onBack={()=>void loadTool('overview')}>{context?.outlet_id ? <ToolBody tool={tool} context={context} plan={plan} products={products} categories={categories} payments={payments} expenses={expenses} cashSessions={cashSessions} attendance={attendance} audit={audit} onRefresh={onRefresh} setProducts={setProducts} setCategories={setCategories} setPayments={setPayments} setExpenses={setExpenses} setCashSessions={setCashSessions} setAttendance={setAttendance} setAudit={setAudit} onError={onError} onNotice={onNotice}/>:<Empty icon={<ShieldCheck/>} title="Sign in required." body="Operational settings only load from an approved merchant account." />}</ToolScreen>
  const tools:Array<[Tool,React.ReactNode,string,string]>=[['marketplace',<Store/>,'Masinloc Connect Marketplace','Public listing & Order now'],['catalog',<Boxes/>,'Catalog & Inventory',plan?`${products.length}/${plan.product_limit} products`:'Products, stock & sold out'],['payments',<WalletCards/>,'Payment Methods','Cash, merchant QR & verification'],['expenses',<Banknote/>,'Expenses','Record operating expenses'],['cash',<Banknote/>,'Cash Register','Opening float & cash variance'],['attendance',<Clock3/>,'Attendance','Clock in / clock out'],['audit',<ShieldCheck/>,'Audit Trail','Sensitive operational actions']]
  return <section><div className="page-heading"><div><p className="eyebrow">Operations</p><h1>More</h1></div></div>{plan&&<div className="plan-card"><strong>Community Free</strong><span>{plan.product_limit} products · {plan.category_limit} categories · {plan.staff_limit} staff + owner · {plan.outlet_limit} location</span></div>}<div className="settings-list">{tools.map(([id,icon,title,desc])=><button key={id} onClick={()=>void loadTool(id)}><span className="settings-icon">{icon}</span><span className="settings-copy"><strong>{title}</strong><small>{desc}</small></span><b>›</b></button>)}</div></section>
}

function ToolBody(props:any) {
  const {tool,context,plan,products,categories,payments,expenses,cashSessions,attendance,audit,onRefresh,setProducts,setCategories,setPayments,setExpenses,setCashSessions,setAttendance,setAudit,onError,onNotice}=props
  if(tool==='marketplace') return <MarketplaceProfileTool context={context} onError={onError} onNotice={onNotice} />
  if(tool==='catalog') return <CatalogTool {...{context,plan,products,categories,onRefresh,setProducts,setCategories,onError,onNotice}} />
  if(tool==='payments') return <PaymentsTool {...{context,payments,setPayments,onError,onNotice}} />
  if(tool==='expenses') return <ExpensesTool {...{context,expenses,setExpenses,onError}} />
  if(tool==='cash') return <CashTool {...{context,cashSessions,setCashSessions,onError,onNotice}} />
  if(tool==='attendance') return <AttendanceTool {...{context,attendance,setAttendance,onError}} />
  return <AuditTool audit={audit} />
}

function CatalogTool({context,plan,products,categories,onRefresh,setProducts,setCategories,onError,onNotice}:any) {
  const canManage=['owner','manager'].includes(context.role); const [newCategory,setNewCategory]=useState(''); const [name,setName]=useState(''); const [price,setPrice]=useState(''); const [category,setCategory]=useState(''); const [track,setTrack]=useState(false); const [stock,setStock]=useState('0'); const [low,setLow]=useState('0')
  const reload=async()=>{const c=await getCatalog(context.merchant_id);setProducts(c.products);setCategories(c.categories);await onRefresh()}
  return <div>{plan&&<div className="usage"><span>Product limit</span><strong>{products.length} / {plan.product_limit}</strong><progress max={plan.product_limit} value={products.length}/></div>}{canManage&&<><form className="inline-form" onSubmit={async(e)=>{e.preventDefault();try{if(!newCategory.trim())return;await createCategory(context.merchant_id,newCategory);setNewCategory('');await reload()}catch(err){onError(messageOf(err))}}}><input value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="New category"/><button>Add category</button></form><form className="stack-form" onSubmit={async(e)=>{e.preventDefault();try{await createProduct({merchantId:context.merchant_id,categoryId:category||null,name,price:Number(price),trackInventory:track,openingStock:Number(stock),lowStockThreshold:Number(low)});setName('');setPrice('');setStock('0');await reload()}catch(err){onError(messageOf(err))}}}><h3>Add product</h3><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Product name"/><input required min="0" step="0.01" type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price"/><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Uncategorized</option>{categories.map((c:CategoryRow)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><label className="checkline"><input type="checkbox" checked={track} onChange={e=>setTrack(e.target.checked)}/> Track stock</label>{track&&<div className="two-fields"><input type="number" min="0" step="0.001" value={stock} onChange={e=>setStock(e.target.value)} placeholder="Opening stock"/><input type="number" min="0" step="0.001" value={low} onChange={e=>setLow(e.target.value)} placeholder="Low-stock alert"/></div>}<button className="primary" disabled={plan&&products.length>=plan.product_limit}>Add product</button></form></>}
    <div className="management-list">{products.map((p:ProductRow)=><article key={p.id}><div><strong>{p.name}</strong><span>{money(Number(p.price))}{p.track_inventory?` · Stock ${p.stock_on_hand}`:''}</span></div><div className="row-actions"><button disabled={!canManage} onClick={async()=>{try{await setProductAvailability(p.id,!p.active);await reload()}catch(err){onError(messageOf(err))}}}>{p.active?'Sold out':'Restore'}</button>{p.track_inventory&&<button disabled={!canManage} onClick={async()=>{const q=Number(window.prompt('Stock change. Positive to restock, negative for waste/adjustment.'));if(!q)return;try{await recordInventoryMovement(p.id,q,q>0?'restock':'waste');await reload()}catch(err){onError(messageOf(err))}}}>Adjust stock</button>}<button disabled={!canManage} onClick={async()=>{if(!window.confirm(`Archive ${p.name}? Sales history will be retained.`))return;try{await archiveProduct(p.id);await reload();onNotice('Product archived. Historical orders were retained.')}catch(err){onError(messageOf(err))}}}><Archive/></button></div></article>)}</div>
  </div>
}

function PaymentsTool({context,payments,setPayments,onError,onNotice}:any) {
  const canManage=['owner','manager'].includes(context.role); const methods:PaymentMethod[]=['cash','gcash','maya','qrph','card']; const labels:Record<string,string>={cash:'Cash',gcash:'GCash',maya:'Maya',qrph:'QR Ph',card:'Card at Counter'}
  const reload=async()=>setPayments(await getPaymentMethods(context.merchant_id,context.outlet_id))
  return <div><div className="guardrail-note"><ShieldCheck/><p>Money goes directly to the business. Digital self-service payments are not released to kitchen until staff verifies them.</p></div><div className="management-list">{methods.map(method=>{const row=payments.find((p:PaymentMethodRow)=>p.method===method);return <article key={method}><div><strong>{labels[method]}</strong><span>{row?.enabled?'Enabled':'Disabled'}{row?.qr_image_path?' · QR configured':''}</span></div><div className="row-actions">{canManage&&['gcash','maya','qrph'].includes(method)&&<label className="file-button">Upload QR<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const path=await uploadPaymentQr({merchantId:context.merchant_id,outletId:context.outlet_id,method,file});await upsertPaymentMethod({merchantId:context.merchant_id,outletId:context.outlet_id,method,label:labels[method],enabled:true,requires_manual_verification:true,qr_image_path:path,instructions:row?.instructions||'Pay the exact amount and enter the reference number.',sort_order:methods.indexOf(method)});await reload();onNotice(`${labels[method]} QR updated.`)}catch(err){onError(messageOf(err))}}}/></label>}<button disabled={!canManage} onClick={async()=>{try{await upsertPaymentMethod({merchantId:context.merchant_id,outletId:context.outlet_id,method,label:labels[method],enabled:!row?.enabled,requires_manual_verification:true,qr_image_path:row?.qr_image_path||null,instructions:row?.instructions||null,sort_order:methods.indexOf(method)});await reload()}catch(err){onError(messageOf(err))}}}>{row?.enabled?'Disable':'Enable'}</button></div></article>})}</div></div>
}

function ExpensesTool({context,expenses,setExpenses,onError}:any){const add=async()=>{const category=window.prompt('Expense category')?.trim();const amount=Number(window.prompt('Amount'));if(!category||!amount)return;try{await createExpense({merchantId:context.merchant_id,outletId:context.outlet_id,category,amount});setExpenses(await getExpenses(context.merchant_id))}catch(e){onError(messageOf(e))}};return <div><button className="primary" onClick={()=>void add()}>Add expense</button>{expenses.length?<div className="management-list">{expenses.map((e:ExpenseRow)=><article key={e.id}><div><strong>{e.category}</strong><span>{e.expense_date}{e.note?` · ${e.note}`:''}</span></div><b>{money(Number(e.amount))}</b></article>)}</div>:<Empty icon={<Banknote/>} title="No expenses recorded." body="Only real expense entries will appear here."/>}</div>}

function CashTool({context,cashSessions,setCashSessions,onError,onNotice}:any){const open=cashSessions.find((s:CashSessionRow)=>s.status==='open');const reload=async()=>setCashSessions(await getCashSessions(context.merchant_id,context.outlet_id));return <div>{open?<div className="cash-card"><strong>Cash session open</strong><span>Opening float {money(Number(open.opening_float))}</span><button className="primary" onClick={async()=>{const counted=Number(window.prompt('Counted cash at close'));if(Number.isNaN(counted))return;try{const result=await closeCashSession(open.id,counted);await reload();onNotice(`Cash variance: ${money(Number(result.variance))}`)}catch(e){onError(messageOf(e))}}}>Close register</button></div>:<button className="primary" onClick={async()=>{const opening=Number(window.prompt('Opening cash float')||'0');try{await openCashSession(context.merchant_id,context.outlet_id,opening);await reload()}catch(e){onError(messageOf(e))}}}>Open register</button>}<div className="guardrail-note"><ShieldCheck/><p>Closing count is compared with verified cash sales and cash movements. Variance is recorded in the audit trail.</p></div></div>}

function AttendanceTool({context,attendance,setAttendance,onError}:any){const open=attendance.find((a:AttendanceRow)=>!a.clock_out_at);const reload=async()=>setAttendance(await getAttendance(context.merchant_id));return <div><button className="primary" onClick={async()=>{try{if(open)await clockOut(context.merchant_id);else await clockIn(context.merchant_id,context.outlet_id);await reload()}catch(e){onError(messageOf(e))}}}>{open?'Clock out':'Clock in'}</button>{attendance.length?<div className="management-list">{attendance.map((a:AttendanceRow)=><article key={a.id}><div><strong>{new Date(a.clock_in_at).toLocaleString()}</strong><span>{a.clock_out_at?`Out ${new Date(a.clock_out_at).toLocaleString()}`:'Currently clocked in'}</span></div></article>)}</div>:<Empty icon={<Clock3/>} title="No attendance entries." body="Clock-ins appear only after staff use the attendance control."/>}</div>}
function AuditTool({audit}:{audit:AuditRow[]}){return audit.length?<div className="audit-list">{audit.map(a=><article key={a.id}><ShieldCheck/><div><strong>{a.action.replaceAll('.',' · ')}</strong><span>{new Date(a.created_at).toLocaleString()} · {a.actor_type}</span></div></article>)}</div>:<Empty icon={<ShieldCheck/>} title="No audit events yet." body="Sensitive payment, inventory, order, cash, and attendance actions are logged here."/>}

function ToolScreen({title,onBack,children}:{title:string;onBack:()=>void;children:React.ReactNode}){return <section><button className="back-link" onClick={onBack}>‹ Back</button><div className="page-heading"><div><p className="eyebrow">Operations</p><h1>{title[0].toUpperCase()+title.slice(1)}</h1></div></div>{children}</section>}
function Empty({icon,title,body}:{icon:React.ReactNode;title:string;body:string}){return <div className="empty"><div>{icon}</div><strong>{title}</strong><p>{body}</p></div>}
function relativeTime(iso:string){const s=Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/1000));if(s<60)return 'Just now';if(s<3600)return `${Math.floor(s/60)} min ago`;if(s<86400)return `${Math.floor(s/3600)} hr ago`;return new Date(iso).toLocaleDateString()}
function messageOf(error:unknown){return error instanceof Error?error.message:String(error||'Something went wrong')}

function SignIn({onClose,onError}:{onClose:()=>void;onError:(m:string)=>void}){const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[busy,setBusy]=useState(false);const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);try{await authApi.signIn(email,password);onClose()}catch(err){onError(messageOf(err))}finally{setBusy(false)}};return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="signin-card" onSubmit={submit}><Brand/><h2>Merchant Sign In</h2><p>Only approved merchant/staff accounts can load business data.</p><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/><input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/><button className="primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><button type="button" className="secondary" onClick={onClose}>Continue review</button></form></div>}
