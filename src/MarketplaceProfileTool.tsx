import { FormEvent, useEffect, useState } from 'react'
import { ShieldCheck, Store } from 'lucide-react'
import type { MerchantContext } from './lib/posApi'
import {
  getMarketplaceProducts,
  getMarketplaceProfile,
  getMerchantSellingSettings,
  MARKETPLACE_CATEGORIES,
  setMarketplaceProduct,
  updateMarketplaceProfile,
  updateMerchantSellingSettings,
  type MarketplaceCategory,
  type MarketplaceProduct,
  type MarketplaceProfile,
  type MerchantMode,
  type MerchantSellingSettings,
} from './lib/marketplaceApi'

const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error || 'Something went wrong')
const money = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount || 0)

export default function MarketplaceProfileTool({ context, onError, onNotice }: {
  context: MerchantContext
  onError: (message: string) => void
  onNotice: (message: string) => void
}) {
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null)
  const [settings, setSettings] = useState<MerchantSellingSettings | null>(null)
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState<MarketplaceCategory | ''>('')
  const [location, setLocation] = useState('')
  const [barangay, setBarangay] = useState('')
  const [description, setDescription] = useState('')
  const [descriptor, setDescriptor] = useState('')
  const [facebookPage, setFacebookPage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [nextProfile, nextSettings, nextProducts] = await Promise.all([
        getMarketplaceProfile(context.merchant_id),
        getMerchantSellingSettings(context.merchant_id),
        getMarketplaceProducts(context.merchant_id),
      ])
      setProfile(nextProfile)
      setSettings(nextSettings)
      setProducts(nextProducts)
      setCategory(nextProfile?.category || '')
      setLocation(nextProfile?.location || '')
      setBarangay(nextProfile?.barangay || '')
      setDescription(nextProfile?.description || '')
      setDescriptor(nextProfile?.descriptor || '')
      setFacebookPage(nextProfile?.facebook_page || '')
    } catch (error) { onError(messageOf(error)) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [context.merchant_id])

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (profile?.claim_review_required) return
    setSaving(true)
    try {
      const result = await updateMarketplaceProfile({ merchantId: context.merchant_id, category, location, barangay, description, descriptor, facebookPage })
      await load()
      onNotice(result.publication_status === 'published' ? 'Marketplace profile updated and published.' : 'Marketplace profile saved.')
    } catch (error) { onError(messageOf(error)) }
    finally { setSaving(false) }
  }

  const saveSettings = async (patch: Partial<MerchantSellingSettings>) => {
    if (!settings) return
    setSaving(true)
    try {
      const next = await updateMerchantSellingSettings({
        merchantId: context.merchant_id,
        merchantMode: (patch.merchant_mode ?? settings.merchant_mode) as MerchantMode,
        marketplaceEnabled: patch.marketplace_enabled ?? settings.marketplace_enabled,
        autoPublish: patch.marketplace_auto_publish ?? settings.marketplace_auto_publish,
        hideOutOfStock: patch.marketplace_hide_out_of_stock ?? settings.marketplace_hide_out_of_stock,
        samePrice: patch.marketplace_same_price ?? settings.marketplace_same_price,
        liveInventory: patch.marketplace_live_inventory ?? settings.marketplace_live_inventory,
        leadTimeMinutes: patch.marketplace_lead_time_minutes ?? settings.marketplace_lead_time_minutes,
      })
      setSettings(next)
      onNotice('Marketplace selling settings saved.')
    } catch (error) { onError(messageOf(error)) }
    finally { setSaving(false) }
  }

  const publishedCount = products.filter(product => product.marketplace_published).length
  const marketplaceLimit = context.plan_code === 'community_free' ? 20 : null

  const toggleProduct = async (product: MarketplaceProduct) => {
    if (!product.marketplace_published && marketplaceLimit !== null && publishedCount >= marketplaceLimit) {
      onError(`Community Free can publish up to ${marketplaceLimit} Marketplace products. Unpublish another item or upgrade after your paid plan is activated.`)
      return
    }
    try {
      await setMarketplaceProduct({
        productId: product.id,
        published: !product.marketplace_published,
        marketplacePrice: product.marketplace_price,
        marketplaceDescription: product.marketplace_description,
      })
      setProducts(await getMarketplaceProducts(context.merchant_id))
    } catch (error) { onError(messageOf(error)) }
  }

  const editMarketplacePrice = async (product: MarketplaceProduct) => {
    const raw = window.prompt(`Marketplace price for ${product.name}`, String(product.marketplace_price ?? product.price))
    if (raw === null) return
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) { onError('Enter a valid Marketplace price.'); return }
    try {
      await setMarketplaceProduct({ productId: product.id, published: product.marketplace_published, marketplacePrice: value, marketplaceDescription: product.marketplace_description })
      setProducts(await getMarketplaceProducts(context.merchant_id))
    } catch (error) { onError(messageOf(error)) }
  }

  if (loading) return <div className="center-state"><div className="spinner" /><strong>Loading Marketplace settings…</strong></div>
  if (!profile || !settings) return <div className="empty"><div><Store /></div><strong>Marketplace unavailable.</strong><p>The POS-linked Marketplace listing or merchant settings could not be loaded.</p></div>
  if (profile.claim_review_required) return <div className="guardrail-note"><ShieldCheck /><p><strong>Admin review required.</strong> An administrator must confirm the existing Marketplace listing belongs to this POS business before it can publish or accept Marketplace orders.</p></div>

  const complete = Boolean(category && location.trim() && description.trim())
  const canSell = profile.publication_status === 'published' && !profile.admin_hidden && settings.marketplace_enabled
  const orderLink = `${window.location.origin}${window.location.pathname}?store=${encodeURIComponent(profile.slug)}&source=marketplace`

  return <div className="marketplace-tool">
    <div className="guardrail-note"><ShieldCheck /><p><strong>{canSell ? 'Marketplace selling is live.' : 'Marketplace selling is not live yet.'}</strong><br />The POS catalog remains the source of truth. Marketplace orders enter the same order queue and use the same stock.</p></div>

    <div className="stack-form">
      <h3>POS mode & Marketplace selling</h3>
      <label>Business mode<select value={settings.merchant_mode} onChange={e => void saveSettings({ merchant_mode: e.target.value as MerchantMode })}><option value="food_service">Food Service</option><option value="retail">Retail</option><option value="hybrid">Hybrid</option></select></label>
      <label className="loyalty-check"><input type="checkbox" checked={settings.marketplace_enabled} onChange={e => void saveSettings({ marketplace_enabled: e.target.checked })} /><span>Sell directly on Marketplace</span></label>
      <label className="loyalty-check"><input type="checkbox" checked={settings.marketplace_auto_publish} onChange={e => void saveSettings({ marketplace_auto_publish: e.target.checked })} /><span>Auto-publish new products</span></label>
      <label className="loyalty-check"><input type="checkbox" checked={settings.marketplace_hide_out_of_stock} onChange={e => void saveSettings({ marketplace_hide_out_of_stock: e.target.checked })} /><span>Hide out-of-stock products</span></label>
      <label className="loyalty-check"><input type="checkbox" checked={settings.marketplace_same_price} onChange={e => void saveSettings({ marketplace_same_price: e.target.checked })} /><span>Use the same POS price on Marketplace</span></label>
      <label className="loyalty-check"><input type="checkbox" checked={settings.marketplace_live_inventory} onChange={e => void saveSettings({ marketplace_live_inventory: e.target.checked })} /><span>Use live POS inventory</span></label>
      <label>Preparation / lead time (minutes)<input type="number" min="0" max="1440" value={settings.marketplace_lead_time_minutes} onChange={e => setSettings({ ...settings, marketplace_lead_time_minutes: Number(e.target.value) })} onBlur={() => void saveSettings({ marketplace_lead_time_minutes: settings.marketplace_lead_time_minutes })} /></label>
      {canSell && <label>Marketplace order link<input readOnly value={orderLink} onFocus={e => e.currentTarget.select()} /></label>}
    </div>

    <form className="stack-form" onSubmit={submitProfile}>
      <h3>Public Marketplace profile</h3>
      <label>Business name<input value={profile.name} disabled /></label>
      <label>Category<select required value={category} onChange={event => setCategory(event.target.value as MarketplaceCategory | '')}><option value="">Choose category</option>{MARKETPLACE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Public location<input required maxLength={300} value={location} onChange={event => setLocation(event.target.value)} /></label>
      <label>Barangay, optional<input maxLength={120} value={barangay} onChange={event => setBarangay(event.target.value)} /></label>
      <label>Short description<textarea required maxLength={1200} rows={4} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <label>Descriptor, optional<input maxLength={120} value={descriptor} onChange={event => setDescriptor(event.target.value)} /></label>
      <label>Facebook page, optional<input type="url" maxLength={500} value={facebookPage} onChange={event => setFacebookPage(event.target.value)} /></label>
      <button className="primary" disabled={saving || !complete}>{saving ? 'Saving…' : 'Save Marketplace profile'}</button>
    </form>

    <div className="stack-form">
      <h3>Products sold on Marketplace</h3>
      <p className="body-copy">Only products switched on here can be ordered from Marketplace. Walk-in POS products remain unaffected.</p>
      {marketplaceLimit !== null && <div className="usage"><span>Community Free Marketplace slots</span><strong>{publishedCount} / {marketplaceLimit}</strong><progress max={marketplaceLimit} value={publishedCount} /></div>}
      <div className="settings-list">
        {products.map(product => {
          const publishBlocked = !product.marketplace_published && marketplaceLimit !== null && publishedCount >= marketplaceLimit
          return <div key={product.id} className="marketplace-product-row">
            <div className="settings-copy"><strong>{product.name}</strong><small>{money(Number(product.price))} POS · {product.track_inventory ? `${product.stock_on_hand} in stock` : 'stock not tracked'}{!settings.marketplace_same_price ? ` · ${money(Number(product.marketplace_price ?? product.price))} Marketplace` : ''}</small></div>
            {!settings.marketplace_same_price && <button type="button" className="secondary small" onClick={() => void editMarketplacePrice(product)}>Price</button>}
            <label className="switch-inline"><input type="checkbox" disabled={publishBlocked} checked={product.marketplace_published} onChange={() => void toggleProduct(product)} /><span>{product.marketplace_published ? 'Live' : publishBlocked ? 'Limit' : 'Off'}</span></label>
          </div>
        })}
      </div>
    </div>
  </div>
}
