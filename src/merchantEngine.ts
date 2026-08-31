export type MerchantMode = 'food_service' | 'retail' | 'hybrid'
export type PlanTier = 'free' | 'pro' | 'business_plus'

export type MerchantVertical =
  | 'sari_sari'
  | 'grocery'
  | 'mini_mart'
  | 'cafe'
  | 'restaurant'
  | 'bakery'
  | 'food_kiosk'
  | 'pharmacy'
  | 'hardware'
  | 'clothing'
  | 'beauty'
  | 'salon'
  | 'repair_parts'
  | 'home_seller'
  | 'market_retailer'
  | 'specialty_retail'

export type Capability =
  | 'pos'
  | 'qr_ordering'
  | 'marketplace_selling'
  | 'customer_records'
  | 'basic_loyalty'
  | 'basic_reports'
  | 'basic_inventory'
  | 'expense_tracking'
  | 'barcode_scanning'
  | 'thermal_printing'
  | 'multiple_printers'
  | 'inventory_history'
  | 'inventory_adjustments'
  | 'low_stock_alerts'
  | 'suppliers'
  | 'purchase_orders'
  | 'kitchen_workflow'
  | 'staff_accounts'
  | 'discount_controls'
  | 'advanced_reports'
  | 'exports'
  | 'multi_branch'
  | 'role_permissions'
  | 'stock_transfers'
  | 'inventory_valuation'
  | 'usage_forecasting'
  | 'advanced_profitability'
  | 'audit_log'
  | 'priority_support'

export type PlanDefinition = {
  id: PlanTier
  label: string
  monthlyPricePHP: number
  annualPricePHP?: number
  maxLocations: number | 'unlimited'
  maxStaff: number | 'unlimited'
  maxProducts: number | 'unlimited'
  capabilities: readonly Capability[]
}

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  free: {
    id: 'free',
    label: 'Free',
    monthlyPricePHP: 0,
    maxLocations: 1,
    maxStaff: 3,
    maxProducts: 100,
    capabilities: [
      'pos', 'qr_ordering', 'marketplace_selling', 'customer_records', 'basic_loyalty',
      'basic_reports', 'basic_inventory', 'expense_tracking', 'kitchen_workflow',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthlyPricePHP: 249,
    annualPricePHP: 1990,
    maxLocations: 1,
    maxStaff: 10,
    maxProducts: 1000,
    capabilities: [
      'pos', 'qr_ordering', 'marketplace_selling', 'customer_records', 'basic_loyalty', 'basic_reports',
      'basic_inventory', 'expense_tracking', 'barcode_scanning', 'thermal_printing',
      'multiple_printers', 'inventory_history', 'inventory_adjustments', 'low_stock_alerts',
      'suppliers', 'kitchen_workflow', 'staff_accounts', 'discount_controls',
      'advanced_reports', 'exports',
    ],
  },
  business_plus: {
    id: 'business_plus',
    label: 'Business+',
    monthlyPricePHP: 399,
    annualPricePHP: 2990,
    maxLocations: 'unlimited',
    maxStaff: 'unlimited',
    maxProducts: 'unlimited',
    capabilities: [
      'pos', 'qr_ordering', 'marketplace_selling', 'customer_records', 'basic_loyalty', 'basic_reports',
      'basic_inventory', 'expense_tracking', 'barcode_scanning', 'thermal_printing',
      'multiple_printers', 'inventory_history', 'inventory_adjustments', 'low_stock_alerts',
      'suppliers', 'purchase_orders', 'kitchen_workflow', 'staff_accounts', 'discount_controls',
      'advanced_reports', 'exports', 'multi_branch', 'role_permissions', 'stock_transfers',
      'inventory_valuation', 'usage_forecasting', 'advanced_profitability', 'audit_log',
      'priority_support',
    ],
  },
}

export type MarketplacePriceMode = 'same_as_pos' | 'custom'
export type MarketplaceStockMode = 'live_inventory' | 'manual_availability'

export type MarketplaceSettings = {
  enabled: boolean
  storefrontVisible: boolean
  autoPublishNewProducts: boolean
  hideOutOfStock: boolean
  priceMode: MarketplacePriceMode
  stockMode: MarketplaceStockMode
  allowPickup: boolean
  allowDelivery: boolean
  minimumOrder?: number
  orderLeadTimeMinutes?: number
}

export const DEFAULT_MARKETPLACE_SETTINGS: MarketplaceSettings = {
  enabled: false,
  storefrontVisible: false,
  autoPublishNewProducts: false,
  hideOutOfStock: true,
  priceMode: 'same_as_pos',
  stockMode: 'live_inventory',
  allowPickup: true,
  allowDelivery: false,
}

export type ProductRecord = {
  id: string
  sku?: string
  barcode?: string
  name: string
  category: string
  price: number
  cost?: number
  trackInventory: boolean
  stockOnHand?: number
  lowStockThreshold?: number
  available: boolean
  publishToMarketplace?: boolean
  marketplacePrice?: number
  marketplaceTitle?: string
  marketplaceDescription?: string
  marketplaceImageUrl?: string
}

export type InventoryMovementReason =
  | 'sale'
  | 'restock'
  | 'return'
  | 'damaged'
  | 'expired'
  | 'lost'
  | 'personal_use'
  | 'count_correction'
  | 'transfer_in'
  | 'transfer_out'
  | 'other'

export type InventoryMovement = {
  id: string
  productId: string
  outletId: string
  quantityDelta: number
  reason: InventoryMovementReason
  unitCost?: number
  note?: string
  at: string
  actorId?: string
}

export type ExpenseRecord = {
  id: string
  outletId: string
  category: string
  amount: number
  supplierId?: string
  note?: string
  at: string
}

export type BusinessDay = {
  id: string
  outletId: string
  openedAt: string
  openedBy: string
  openingCash: number
  closedAt?: string
  closedBy?: string
  actualClosingCash?: number
}

export type BusinessDaySummary = {
  totalOrders: number
  grossSales: number
  discounts: number
  refunds: number
  netSales: number
  cashSales: number
  nonCashSales: number
  expenses: number
  expectedClosingCash: number
  actualClosingCash?: number
  overShort?: number
}

export const hasCapability = (plan: PlanTier, capability: Capability) =>
  PLAN_DEFINITIONS[plan].capabilities.includes(capability)

export const inventoryValue = (products: ProductRecord[]) =>
  products.reduce((sum, product) => {
    if (!product.trackInventory) return sum
    return sum + (product.stockOnHand ?? 0) * (product.cost ?? 0)
  }, 0)

export const daysOfStockRemaining = (stockOnHand: number, averageDailyUsage: number) => {
  if (averageDailyUsage <= 0) return null
  return stockOnHand / averageDailyUsage
}

export const marketplacePriceFor = (
  product: ProductRecord,
  settings: MarketplaceSettings,
) => settings.priceMode === 'custom' && product.marketplacePrice != null
  ? product.marketplacePrice
  : product.price

export const isMarketplaceSellable = (
  product: ProductRecord,
  settings: MarketplaceSettings,
) => {
  if (!settings.enabled || !settings.storefrontVisible || !product.publishToMarketplace || !product.available) return false
  if (settings.stockMode === 'live_inventory' && settings.hideOutOfStock && product.trackInventory) {
    return (product.stockOnHand ?? 0) > 0
  }
  return true
}
