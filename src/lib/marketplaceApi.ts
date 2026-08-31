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
export type MerchantMode = 'food_service' | 'retail' | 'hybrid'

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

export type MerchantSellingSettings = {
  merchant_id: string
  merchant_mode: MerchantMode
  marketplace_enabled: boolean
  marketplace_auto_publish: boolean
  marketplace_hide_out_of_stock: boolean
  marketplace_same_price: boolean
  marketplace_live_inventory: boolean
  marketplace_lead_time_minutes: number
  created_at: string
  updated_at: string
}

export type MarketplaceProduct = {
  id: string
  name: string
  price: number
  active: boolean
  track_inventory: boolean
  stock_on_hand: number
  marketplace_published: boolean
  marketplace_price: number | null
  marketplace_description: string | null
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

export async function getMerchantSellingSettings(merchantId: string): Promise<MerchantSellingSettings> {
  const { data, error } = await supabase.rpc('pos_get_merchant_settings', { p_merchant_id: merchantId })
  if (error) throw error
  return data as MerchantSellingSettings
}

export async function updateMerchantSellingSettings(input: {
  merchantId: string
  merchantMode: MerchantMode
  marketplaceEnabled: boolean
  autoPublish: boolean
  hideOutOfStock: boolean
  samePrice: boolean
  liveInventory: boolean
  leadTimeMinutes: number
}) {
  const { data, error } = await supabase.rpc('pos_update_merchant_settings', {
    p_merchant_id: input.merchantId,
    p_merchant_mode: input.merchantMode,
    p_marketplace_enabled: input.marketplaceEnabled,
    p_marketplace_auto_publish: input.autoPublish,
    p_marketplace_hide_out_of_stock: input.hideOutOfStock,
    p_marketplace_same_price: input.samePrice,
    p_marketplace_live_inventory: input.liveInventory,
    p_marketplace_lead_time_minutes: input.leadTimeMinutes,
  })
  if (error) throw error
  return data as MerchantSellingSettings
}

export async function getMarketplaceProducts(merchantId: string): Promise<MarketplaceProduct[]> {
  const { data, error } = await supabase
    .from('pos_products')
    .select('id,name,price,active,track_inventory,stock_on_hand,marketplace_published,marketplace_price,marketplace_description')
    .eq('merchant_id', merchantId)
    .is('archived_at', null)
    .order('sort_order')
    .order('name')
  if (error) throw error
  return (data || []) as MarketplaceProduct[]
}

export async function setMarketplaceProduct(input: {
  productId: string
  published: boolean
  marketplacePrice?: number | null
  marketplaceDescription?: string | null
}) {
  const { data, error } = await supabase.rpc('pos_set_product_marketplace', {
    p_product_id: input.productId,
    p_published: input.published,
    p_marketplace_price: input.marketplacePrice ?? null,
    p_marketplace_description: input.marketplaceDescription ?? null,
  })
  if (error) throw error
  return data as Pick<MarketplaceProduct, 'id' | 'marketplace_published' | 'marketplace_price' | 'marketplace_description'>
}
