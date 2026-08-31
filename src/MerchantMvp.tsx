import { useMemo, useState } from 'react'
import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Home,
  PackagePlus,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Tag,
} from 'lucide-react'
import { money } from './domain'
import type { MerchantMode, PlanTier, ProductRecord } from './merchantEngine'
import { PLAN_DEFINITIONS, inventoryValue } from './merchantEngine'
import './merchantMvp.css'

type Tab = 'overview' | 'pos' | 'inventory' | 'expenses' | 'marketplace' | 'reports' | 'learn' | 'settings'
type Expense = { id: string; category: string; amount: number; note: string; at: string }
type Sale = { id: string; amount: number; payment: 'cash' | 'gcash' | 'maya' | 'qrph' | 'card'; at: string; source: 'pos' | 'marketplace' }
type MarketplaceSettings = {
  enabled: boolean
  autoPublish: boolean
  hideOutOfStock: boolean
  useSamePrice: boolean
  liveInventory: boolean
  pickup: boolean
  delivery: boolean
  minimumOrder: number
  leadTimeMinutes: number
}

type MvpState = {
  mode: MerchantMode
  plan: PlanTier
  businessDayOpen: boolean
  openingCash: number
  openedAt?: string
  products: ProductRecord[]
  expenses: Expense[]
  sales: Sale[]
  published: Record<string, boolean>
  marketplace: MarketplaceSettings
}

const seedProducts: ProductRecord[] = [
  { id: 'p1', sku: 'COF-001', barcode: '480000000001', name: 'Iced Spanish Latte', category: 'Coffee', price: 145, cost: 62, trackInventory: true, stockOnHand: 28, lowStockThreshold: 8, available: true },
  { id: 'p2', sku: 'COF-002', barcode: '480000000002', name: 'Cappuccino', category: 'Coffee', price: 125, cost: 51, trackInventory: true, stockOnHand: 16, lowStockThreshold: 6, available: true },
  { id: 'p3', sku: 'FOD-001', barcode: '480000000003', name: 'Chicken Sandwich', category: 'Food', price: 120, cost: 55, trackInventory: true, stockOnHand: 10, lowStockThreshold: 5, available: true },
  { id: 'p4', sku: 'RTL-001', barcode: '480000000004', name: 'House Blend Beans 250g', category: 'Retail', price: 360, cost: 185, trackInventory: true, stockOnHand: 7, lowStockThreshold: 4, available: true },
]

const defaultState: MvpState = {
  mode: 'hybrid',
  plan: 'free',
  businessDayOpen: false,
  openingCash: 0,
  products: seedProducts,
  expenses: [],
  sales: [],
  published: { p1: true, p2: true, p3: true, p4: false },
  marketplace: {
    enabled: true,
    autoPublish: false,
    hideOutOfStock: true,
    useSamePrice: true,
    liveInventory: true,
    pickup: true,
    delivery: false,
    minimumOrder: 0,
    leadTimeMinutes: 20,
  },
}

const STORAGE_KEY = 'masinloc-pos-merchant-mvp-v1'
const loadState = (): MvpState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState
  } catch {
    return defaultState
  }
}

const tabLabel: Record<Tab, string> = {
  overview: 'Overview', pos: 'POS', inventory: 'Inventory', expenses: 'Expenses', marketplace: 'Marketplace', reports: 'Reports', learn: 'Learn', settings: 'Settings',
}

export default function MerchantMvp() {
  const [state, setState] = useState<MvpState>(() => loadState())
  const [tab, setTab] = useState<Tab>('overview')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')

  const save = (next: MvpState) => {
    setState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const salesTotal = state.sales.reduce((sum, sale) => sum + sale.amount, 0)
  const expenseTotal = state.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const estimatedProfit = salesTotal - state.products.reduce((sum, product) => sum + Math.max(0, (seedProducts.find(seed => seed.id === product.id)?.stockOnHand ?? 0) - (product.stockOnHand ?? 0)) * (product.cost ?? 0), 0) - expenseTotal
  const lowStock = state.products.filter(product => product.trackInventory && (product.stockOnHand ?? 0) <= (product.lowStockThreshold ?? 0))

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => sum + (state.products.find(product => product.id === id)?.price ?? 0) * qty, 0)
  const filteredProducts = state.products.filter(product => `${product.name} ${product.sku ?? ''} ${product.barcode ?? ''}`.toLowerCase().includes(search.toLowerCase()))

  const checkout = (payment: Sale['payment']) => {
    if (!state.businessDayOpen || cartTotal <= 0) return
    const products = state.products.map(product => {
      const qty = cart[product.id] ?? 0
      if (!qty || !product.trackInventory) return product
      const nextStock = Math.max(0, (product.stockOnHand ?? 0) - qty)
      return { ...product, stockOnHand: nextStock, available: nextStock > 0 }
    })
    save({
      ...state,
      products,
      sales: [{ id: `S-${Date.now()}`, amount: cartTotal, payment, at: new Date().toISOString(), source: 'pos' }, ...state.sales],
    })
    setCart({})
  }

  const nav: Array<{ id: Tab; icon: React.ReactNode }> = [
    { id: 'overview', icon: <Home /> }, { id: 'pos', icon: <Store /> }, { id: 'inventory', icon: <Boxes /> },
    { id: 'expenses', icon: <CircleDollarSign /> }, { id: 'marketplace', icon: <ShoppingBag /> }, { id: 'reports', icon: <BarChart3 /> },
    { id: 'learn', icon: <GraduationCap /> }, { id: 'settings', icon: <Settings /> },
  ]

  return (
    <div className="mvp-shell">
      <aside className="mvp-sidebar">
        <div className="mvp-logo"><strong>MASINLOC</strong><span>POS</span></div>
        <div className="mvp-store"><small>Current business</small><strong>ABC Café</strong><span>Masinloc, Zambales</span></div>
        <nav>{nav.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.icon}<span>{tabLabel[item.id]}</span></button>)}</nav>
        <div className="mvp-plan"><small>{PLAN_DEFINITIONS[state.plan].label} plan</small><strong>{money(PLAN_DEFINITIONS[state.plan].monthlyPricePHP)}/mo</strong></div>
      </aside>

      <main className="mvp-main">
        <header className="mvp-header">
          <div><p>Merchant operations</p><h1>{tabLabel[tab]}</h1></div>
          <div className={state.businessDayOpen ? 'mvp-day open' : 'mvp-day'}><span>{state.businessDayOpen ? 'Business day open' : 'Business day closed'}</span></div>
        </header>

        {tab === 'overview' && (
          <section>
            <div className="mvp-kpis">
              <Kpi label="Sales" value={money(salesTotal)} note={`${state.sales.length} transactions`} />
              <Kpi label="Expenses" value={money(expenseTotal)} note={`${state.expenses.length} entries`} />
              <Kpi label="Est. profit" value={money(estimatedProfit)} note="Operational estimate" />
              <Kpi label="Inventory value" value={money(inventoryValue(state.products))} note={`${lowStock.length} low-stock items`} />
            </div>
            <div className="mvp-grid-2">
              <Panel title="Business day">
                {state.businessDayOpen ? <>
                  <p className="mvp-muted">Opened {state.openedAt ? new Date(state.openedAt).toLocaleString('en-PH') : ''}</p>
                  <div className="mvp-summary-row"><span>Opening cash</span><strong>{money(state.openingCash)}</strong></div>
                  <div className="mvp-summary-row"><span>Cash sales</span><strong>{money(state.sales.filter(s => s.payment === 'cash').reduce((a, b) => a + b.amount, 0))}</strong></div>
                  <button className="mvp-secondary" onClick={() => save({ ...state, businessDayOpen: false })}>Close business day</button>
                </> : <OpenDay state={state} save={save} />}
              </Panel>
              <Panel title="Needs attention">
                {lowStock.length ? lowStock.map(product => <div className="mvp-alert" key={product.id}><span>{product.name}</span><strong>{product.stockOnHand ?? 0} left</strong></div>) : <p className="mvp-muted">No low-stock items.</p>}
              </Panel>
            </div>
            <Panel title="Marketplace">
              <div className="mvp-market-status"><div><strong>{state.marketplace.enabled ? 'Storefront is live' : 'Storefront is off'}</strong><p>{Object.values(state.published).filter(Boolean).length} products selected for Marketplace.</p></div><button className="mvp-primary" onClick={() => setTab('marketplace')}>Manage selling</button></div>
            </Panel>
          </section>
        )}

        {tab === 'pos' && (
          <section className="mvp-pos-layout">
            <div>
              <div className="mvp-toolbar"><div className="mvp-search"><Search /><input placeholder="Search name, SKU or barcode" value={search} onChange={event => setSearch(event.target.value)} /></div><select value={state.mode} onChange={e => save({ ...state, mode: e.target.value as MerchantMode })}><option value="food_service">Food Service</option><option value="retail">Retail</option><option value="hybrid">Hybrid</option></select></div>
              {!state.businessDayOpen && <div className="mvp-warning">Open the business day before charging a sale.</div>}
              <div className="mvp-products">{filteredProducts.map(product => <button key={product.id} disabled={!product.available} onClick={() => setCart(current => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))}><small>{product.category}</small><strong>{product.name}</strong><span>{money(product.price)}</span><em>{product.stockOnHand ?? '∞'} in stock</em>{cart[product.id] ? <b>{cart[product.id]}</b> : null}</button>)}</div>
            </div>
            <aside className="mvp-cart"><h2>Current sale</h2>{Object.entries(cart).length ? Object.entries(cart).map(([id, qty]) => { const product = state.products.find(p => p.id === id)!; return <div className="mvp-cart-line" key={id}><div><strong>{product.name}</strong><span>{qty} × {money(product.price)}</span></div><button onClick={() => setCart(current => { const next = { ...current }; if ((next[id] ?? 0) <= 1) delete next[id]; else next[id] -= 1; return next })}>−</button></div> }) : <p className="mvp-muted">Scan or select a product.</p>}<div className="mvp-cart-total"><span>Total</span><strong>{money(cartTotal)}</strong></div><div className="mvp-pay-grid"><button disabled={!state.businessDayOpen || !cartTotal} onClick={() => checkout('cash')}>Cash</button><button disabled={!state.businessDayOpen || !cartTotal} onClick={() => checkout('gcash')}>GCash</button><button disabled={!state.businessDayOpen || !cartTotal} onClick={() => checkout('maya')}>Maya</button><button disabled={!state.businessDayOpen || !cartTotal} onClick={() => checkout('qrph')}>QR Ph</button></div></aside>
          </section>
        )}

        {tab === 'inventory' && <Inventory state={state} save={save} />}
        {tab === 'expenses' && <Expenses state={state} save={save} />}
        {tab === 'marketplace' && <Marketplace state={state} save={save} />}
        {tab === 'reports' && <Reports state={state} estimatedProfit={estimatedProfit} />}
        {tab === 'learn' && <Learn />}
        {tab === 'settings' && <SettingsPanel state={state} save={save} />}
      </main>
    </div>
  )
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) { return <article className="mvp-kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></article> }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <article className="mvp-panel"><h2>{title}</h2>{children}</article> }

function OpenDay({ state, save }: { state: MvpState; save: (state: MvpState) => void }) {
  const [cash, setCash] = useState('1000')
  return <div className="mvp-form"><p className="mvp-muted">Opening a business day starts cash and transaction tracking.</p><label>Opening cash<input inputMode="decimal" value={cash} onChange={e => setCash(e.target.value)} /></label><button className="mvp-primary" onClick={() => save({ ...state, businessDayOpen: true, openingCash: Number(cash) || 0, openedAt: new Date().toISOString() })}>Open business day</button></div>
}

function Inventory({ state, save }: { state: MvpState; save: (state: MvpState) => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const add = () => {
    if (!name.trim() || !Number(price)) return
    const id = `p-${Date.now()}`
    const product: ProductRecord = { id, name: name.trim(), category: 'General', price: Number(price), cost: 0, trackInventory: true, stockOnHand: Number(stock) || 0, lowStockThreshold: 5, available: true }
    save({ ...state, products: [...state.products, product], published: state.marketplace.autoPublish ? { ...state.published, [id]: true } : state.published })
    setName(''); setPrice(''); setStock('')
  }
  return <section><div className="mvp-grid-2"><Panel title="Add product"><div className="mvp-form"><label>Product name<input value={name} onChange={e => setName(e.target.value)} /></label><label>Selling price<input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} /></label><label>Opening stock<input inputMode="numeric" value={stock} onChange={e => setStock(e.target.value)} /></label><button className="mvp-primary" onClick={add}><PackagePlus /> Add product</button></div></Panel><Panel title="Inventory value"><strong className="mvp-big-number">{money(inventoryValue(state.products))}</strong><p className="mvp-muted">Based on current stock × recorded unit cost.</p></Panel></div><div className="mvp-table"><div className="mvp-table-head"><span>Product</span><span>SKU / barcode</span><span>Stock</span><span>Price</span><span>Adjust</span></div>{state.products.map(product => <div className="mvp-table-row" key={product.id}><span><strong>{product.name}</strong><small>{product.category}</small></span><span>{product.sku ?? '—'}<small>{product.barcode ?? ''}</small></span><span>{product.stockOnHand ?? '—'}</span><span>{money(product.price)}</span><span className="mvp-inline-buttons"><button onClick={() => save({ ...state, products: state.products.map(p => p.id === product.id ? { ...p, stockOnHand: Math.max(0, (p.stockOnHand ?? 0) - 1) } : p) })}>−</button><button onClick={() => save({ ...state, products: state.products.map(p => p.id === product.id ? { ...p, stockOnHand: (p.stockOnHand ?? 0) + 1, available: true } : p) })}>+</button></span></div>)}</div></section>
}

function Expenses({ state, save }: { state: MvpState; save: (state: MvpState) => void }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Supplies')
  const [note, setNote] = useState('')
  const add = () => { if (!Number(amount)) return; save({ ...state, expenses: [{ id: `E-${Date.now()}`, category, amount: Number(amount), note, at: new Date().toISOString() }, ...state.expenses] }); setAmount(''); setNote('') }
  return <section className="mvp-grid-2"><Panel title="Record expense"><div className="mvp-form"><label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option>Supplies</option><option>Utilities</option><option>Transport</option><option>Rent</option><option>Wages</option><option>Other</option></select></label><label>Amount<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></label><label>Note<input value={note} onChange={e => setNote(e.target.value)} /></label><button className="mvp-primary" onClick={add}><Plus /> Save expense</button></div></Panel><Panel title="Recent expenses">{state.expenses.length ? state.expenses.map(expense => <div className="mvp-summary-row" key={expense.id}><span>{expense.category}<small>{expense.note}</small></span><strong>{money(expense.amount)}</strong></div>) : <p className="mvp-muted">No expenses recorded yet.</p>}</Panel></section>
}

function Marketplace({ state, save }: { state: MvpState; save: (state: MvpState) => void }) {
  const update = (partial: Partial<MarketplaceSettings>) => save({ ...state, marketplace: { ...state.marketplace, ...partial } })
  return <section><Panel title="Sell directly to Marketplace"><div className="mvp-market-status"><div><strong>{state.marketplace.enabled ? 'Marketplace selling is ON' : 'Marketplace selling is OFF'}</strong><p>POS and Marketplace use one catalog and one stock count.</p></div><Toggle checked={state.marketplace.enabled} onChange={enabled => update({ enabled })} /></div></Panel><div className="mvp-grid-2"><Panel title="Publishing settings"><SettingToggle label="Auto-publish new products" checked={state.marketplace.autoPublish} set={value => update({ autoPublish: value })} /><SettingToggle label="Hide out-of-stock products" checked={state.marketplace.hideOutOfStock} set={value => update({ hideOutOfStock: value })} /><SettingToggle label="Use same POS price" checked={state.marketplace.useSamePrice} set={value => update({ useSamePrice: value })} /><SettingToggle label="Live inventory sync" checked={state.marketplace.liveInventory} set={value => update({ liveInventory: value })} /><SettingToggle label="Allow pickup" checked={state.marketplace.pickup} set={value => update({ pickup: value })} /><SettingToggle label="Allow delivery" checked={state.marketplace.delivery} set={value => update({ delivery: value })} /></Panel><Panel title="Order rules"><div className="mvp-form"><label>Minimum order<input inputMode="decimal" value={state.marketplace.minimumOrder} onChange={e => update({ minimumOrder: Number(e.target.value) || 0 })} /></label><label>Preparation lead time (minutes)<input inputMode="numeric" value={state.marketplace.leadTimeMinutes} onChange={e => update({ leadTimeMinutes: Number(e.target.value) || 0 })} /></label></div></Panel></div><Panel title="Products published to Marketplace"><div className="mvp-publish-list">{state.products.map(product => <div key={product.id}><div><strong>{product.name}</strong><span>{money(product.price)} · {product.stockOnHand ?? '∞'} in stock</span></div><Toggle checked={Boolean(state.published[product.id])} onChange={published => save({ ...state, published: { ...state.published, [product.id]: published } })} /></div>)}</div></Panel></section>
}

function Reports({ state, estimatedProfit }: { state: MvpState; estimatedProfit: number }) {
  const posSales = state.sales.filter(s => s.source === 'pos').reduce((a, b) => a + b.amount, 0)
  const marketplaceSales = state.sales.filter(s => s.source === 'marketplace').reduce((a, b) => a + b.amount, 0)
  const expenses = state.expenses.reduce((a, b) => a + b.amount, 0)
  return <section><div className="mvp-kpis"><Kpi label="POS sales" value={money(posSales)} note="Walk-in/staff checkout" /><Kpi label="Marketplace" value={money(marketplaceSales)} note="Marketplace orders" /><Kpi label="Expenses" value={money(expenses)} note="Recorded operating expense" /><Kpi label="Est. profit" value={money(estimatedProfit)} note="Not an accounting statement" /></div><Panel title="Payment breakdown">{(['cash','gcash','maya','qrph','card'] as const).map(method => <div className="mvp-summary-row" key={method}><span>{method.toUpperCase()}</span><strong>{money(state.sales.filter(s => s.payment === method).reduce((a,b) => a+b.amount,0))}</strong></div>)}</Panel></section>
}

function Learn() {
  const lessons = ['Open and close a business day','Take your first POS sale','Scan or search a product','Receive and adjust stock','Publish products to Marketplace','Record business expenses','Read sales and profit reports','Connect receipt and kitchen printers']
  return <section><Panel title="Merchant training"><p className="mvp-muted">Short operating lessons built around the actual POS workflow.</p><div className="mvp-lessons">{lessons.map((lesson,index) => <article key={lesson}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{lesson}</strong><small>2–4 minute lesson</small></div><button>Start</button></article>)}</div></Panel></section>
}

function SettingsPanel({ state, save }: { state: MvpState; save: (state: MvpState) => void }) {
  return <section className="mvp-grid-2"><Panel title="Business mode"><div className="mvp-form"><label>Operating mode<select value={state.mode} onChange={e => save({ ...state, mode: e.target.value as MerchantMode })}><option value="food_service">Food Service</option><option value="retail">Retail</option><option value="hybrid">Hybrid</option></select></label><p className="mvp-muted">Food uses visual/kitchen workflows. Retail favors barcode checkout. Hybrid supports both.</p></div></Panel><Panel title="Plan"><div className="mvp-form"><label>Demo plan<select value={state.plan} onChange={e => save({ ...state, plan: e.target.value as PlanTier })}><option value="free">Free</option><option value="pro">Pro</option><option value="business_plus">Business+</option></select></label><p className="mvp-muted">Capability enforcement moves server-side when production billing/backend is connected.</p></div></Panel></section>
}

function SettingToggle({ label, checked, set }: { label: string; checked: boolean; set: (value: boolean) => void }) { return <div className="mvp-setting-row"><span>{label}</span><Toggle checked={checked} onChange={set} /></div> }
function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) { return <button className={checked ? 'mvp-toggle on' : 'mvp-toggle'} onClick={() => onChange(!checked)} aria-pressed={checked}><i /></button> }
