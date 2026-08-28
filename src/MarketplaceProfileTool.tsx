import { FormEvent, useEffect, useState } from 'react'
import { ShieldCheck, Store } from 'lucide-react'
import type { MerchantContext } from './lib/posApi'
import {
  getMarketplaceProfile,
  MARKETPLACE_CATEGORIES,
  updateMarketplaceProfile,
  type MarketplaceCategory,
  type MarketplaceProfile,
} from './lib/marketplaceApi'

const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error || 'Something went wrong')

export default function MarketplaceProfileTool({ context, onError, onNotice }: {
  context: MerchantContext
  onError: (message: string) => void
  onNotice: (message: string) => void
}) {
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null)
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
      const next = await getMarketplaceProfile(context.merchant_id)
      setProfile(next)
      setCategory(next?.category || '')
      setLocation(next?.location || '')
      setBarangay(next?.barangay || '')
      setDescription(next?.description || '')
      setDescriptor(next?.descriptor || '')
      setFacebookPage(next?.facebook_page || '')
    } catch (error) {
      onError(messageOf(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [context.merchant_id])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (profile?.claim_review_required) return
    setSaving(true)
    try {
      const result = await updateMarketplaceProfile({
        merchantId: context.merchant_id,
        category,
        location,
        barangay,
        description,
        descriptor,
        facebookPage,
      })
      await load()
      onNotice(result.publication_status === 'published'
        ? 'Marketplace profile updated and published.'
        : 'Marketplace profile saved. It will publish automatically when all requirements are met.')
    } catch (error) {
      onError(messageOf(error))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="center-state"><div className="spinner" /><strong>Loading Marketplace profile…</strong></div>
  if (!profile) return <div className="empty"><div><Store /></div><strong>Marketplace profile unavailable.</strong><p>The system did not find the POS-linked listing. This should be reviewed before the business goes live.</p></div>

  if (profile.claim_review_required) {
    return <div className="guardrail-note"><ShieldCheck /><p><strong>Admin review required.</strong> A Marketplace listing already uses this business slug. We did not auto-claim it from a name match. An administrator must confirm the existing listing belongs to this POS business before it can publish or accept Marketplace orders.</p></div>
  }

  const complete = Boolean(category && location.trim() && description.trim())
  const statusText = profile.admin_hidden
    ? 'Hidden by administrator'
    : profile.publication_status === 'published'
      ? 'Published in Masinloc Connect Marketplace'
      : complete
        ? 'Saved · waiting for eligibility/system checks'
        : 'Draft · complete the required public fields'

  return <div>
    <div className="guardrail-note"><ShieldCheck /><p><strong>{statusText}</strong><br />Only the public fields below are sent to Marketplace. Owner contact details, POS sales, customers, inventory, and staff data are never published.</p></div>

    <form className="stack-form" onSubmit={submit}>
      <h3>Marketplace profile</h3>
      <label>Business name<input value={profile.name} disabled /></label>
      <label>Category<select required value={category} onChange={event => setCategory(event.target.value as MarketplaceCategory | '')}><option value="">Choose category</option>{MARKETPLACE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Public location<input required maxLength={300} value={location} onChange={event => setLocation(event.target.value)} placeholder="Example: Barangay Inhobol, Masinloc, Zambales" /></label>
      <label>Barangay, optional<input maxLength={120} value={barangay} onChange={event => setBarangay(event.target.value)} /></label>
      <label>Short description<textarea required maxLength={1200} rows={5} value={description} onChange={event => setDescription(event.target.value)} placeholder="What the business actually offers. Do not add unverified claims." /></label>
      <label>Descriptor, optional<input maxLength={120} value={descriptor} onChange={event => setDescriptor(event.target.value)} placeholder="Example: Coffee Shop" /></label>
      <label>Facebook page, optional<input type="url" maxLength={500} value={facebookPage} onChange={event => setFacebookPage(event.target.value)} placeholder="https://www.facebook.com/..." /></label>
      <button className="primary" disabled={saving || !complete}>{saving ? 'Saving…' : 'Save Marketplace profile'}</button>
    </form>

    {profile.publication_status === 'published' && <p className="tool-footnote">Marketplace listing: <a href={`https://www.masinloc-zambales.com/marketplace.html#${encodeURIComponent(profile.slug)}`} target="_blank" rel="noopener noreferrer">View Marketplace</a></p>}
  </div>
}
