import { supabase } from './supabase'

export const MARKETPLACE_CATEGORIES = [
  ['food-drinks', 'Food & Drinks'],
  ['catering-events', 'Catering & Events'],
  ['retail', 'Retail'],
  ['beauty-wellness', 'Beauty & Wellness'],
  ['services', 'Services'],
  ['tourism-accommodation', 'Tourism & Accommodation'],
  ['other', 'Other'],
] as const

export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number][0]

export type MarketplaceProfile = {
  slug: string
  name: string
  category: MarketplaceCategory | null
  location: string | null
  barangay: string | null
  description: string | null
  descriptor: string | null
  facebook_page: string | null
  publication_status: 'draft' | 'published' | 'hidden'
  claim_review_required: boolean
  admin_hidden: boolean
  updated_at: string
}

export async function getMarketplaceProfile(merchantId: string): Promise<MarketplaceProfile | null> {
  const { data, error } = await supabase.rpc('pos_get_marketplace_profile', { p_merchant_id: merchantId })
  if (error) throw error
  return (data || null) as MarketplaceProfile | null
}

export async function updateMarketplaceProfile(input: {
  merchantId: string
  category: MarketplaceCategory | ''
  location: string
  barangay?: string
  description: string
  descriptor?: string
  facebookPage?: string
}) {
  const { data, error } = await supabase.rpc('pos_update_marketplace_profile', {
    p_merchant_id: input.merchantId,
    p_category: input.category || null,
    p_location: input.location,
    p_barangay: input.barangay || null,
    p_description: input.description,
    p_descriptor: input.descriptor || null,
    p_facebook_page: input.facebookPage || null,
  })
  if (error) throw error
  return data as { slug: string; publication_status: MarketplaceProfile['publication_status']; claim_review_required: boolean }
}
