import { supabase } from './supabase'
import type { MerchantContext, OrderRow, ProductRow } from './posApi'

export type PlanFeature = { feature_code: string; enabled: boolean }
export type Subscription = {
  merchant_id: string
  plan_code: string
  status: 'active'|'trialing'|'past_due'|'grace'|'cancelled'|'expired'
  billing_period: 'monthly'|'annual'|'manual'
  current_period_end: string | null
  grace_until: string | null
  provider: string | null
  provider_reference: string | null
}
export type Supplier = { id:string; merchant_id:string; name:string; contact_name:string|null; phone:string|null; email:string|null; notes:string|null; active:boolean }
export type PurchaseOrder = { id:string; outlet_id:string; supplier_id:string|null; status:string; reference:string|null; notes:string|null; ordered_at:string|null; received_at:string|null; created_at:string }
export type ReportSummary = { gross_sales:number; refunds:number; net_sales:number; orders:number; pos_sales:number; marketplace_sales:number; qr_sales:number; expenses:number; cogs:number; inventory_value:number; source_breakdown:Record<string,number> }
export type RefundRow = { id:string; order_id:string; amount:number; reason:string; restock:boolean; created_at:string }
export type InventoryInsight = { product_id:string; name:string; sku:string|null; stock_on_hand:number; cost:number; inventory_value:number; used_quantity:number; average_daily_usage:number; days_remaining:number|null; low_stock:boolean }
export type OutletFulfillment = { id:string; name:string; pickup_enabled:boolean; delivery_enabled:boolean; delivery_fee:number; minimum_delivery_order:number }

export async function getFeatures(planCode:string):Promise<PlanFeature[]> { const {data,error}=await supabase.from('pos_plan_features').select('feature_code,enabled').eq('plan_code',planCode); if(error)throw error; return(data||[])as PlanFeature[] }
export async function getSubscription(merchantId:string):Promise<Subscription|null>{const{data,error}=await supabase.from('pos_subscriptions').select('*').eq('merchant_id',merchantId).maybeSingle();if(error)throw error;return data as Subscription|null}
export async function getOutlets(merchantId:string):Promise<MerchantContext[]>{const{data,error}=await supabase.rpc('pos_my_contexts');if(error)throw error;return((data||[])as MerchantContext[]).filter(row=>row.merchant_id===merchantId)}
export async function getSuppliers(merchantId:string):Promise<Supplier[]>{const{data,error}=await supabase.from('pos_suppliers').select('*').eq('merchant_id',merchantId).eq('active',true).order('name');if(error)throw error;return(data||[])as Supplier[]}
export async function createSupplier(merchantId:string,input:{name:string;contactName?:string;phone?:string;email?:string}){const{data,error}=await supabase.rpc('pos_create_supplier',{p_merchant_id:merchantId,p_name:input.name,p_contact_name:input.contactName||null,p_phone:input.phone||null,p_email:input.email||null});if(error)throw error;return data as string}
export async function getPurchaseOrders(merchantId:string):Promise<PurchaseOrder[]>{const{data,error}=await supabase.from('pos_purchase_orders').select('id,outlet_id,supplier_id,status,reference,notes,ordered_at,received_at,created_at').eq('merchant_id',merchantId).order('created_at',{ascending:false}).limit(100);if(error)throw error;return(data||[])as PurchaseOrder[]}
export async function createPurchaseOrder(input:{merchantId:string;outletId:string;supplierId?:string;reference?:string;notes?:string}){const{data:userData,error:userError}=await supabase.auth.getUser();if(userError||!userData.user)throw userError||new Error('Sign in required');const{data,error}=await supabase.from('pos_purchase_orders').insert({merchant_id:input.merchantId,outlet_id:input.outletId,supplier_id:input.supplierId||null,reference:input.reference||null,notes:input.notes||null,created_by:userData.user.id}).select().single();if(error)throw error;return data as PurchaseOrder}
export async function getReport(merchantId:string,outletId?:string|null,start?:Date,end?:Date):Promise<ReportSummary>{const{data,error}=await supabase.rpc('pos_report_summary',{p_merchant_id:merchantId,p_outlet_id:outletId||null,p_start:start?.toISOString()||null,p_end:end?.toISOString()||null});if(error)throw error;return data as ReportSummary}
export async function refundOrder(orderId:string,reason:string,restock=true){const{data,error}=await supabase.rpc('pos_refund_order',{p_order_id:orderId,p_reason:reason,p_restock:restock});if(error)throw error;return data as{refund_id:string;order_id:string;amount:number;restocked:boolean}}
export async function getRefunds(merchantId:string):Promise<RefundRow[]>{const{data,error}=await supabase.from('pos_refunds').select('id,order_id,amount,reason,restock,created_at').eq('merchant_id',merchantId).order('created_at',{ascending:false}).limit(100);if(error)throw error;return(data||[])as RefundRow[]}
export async function findRetailProducts(merchantId:string,query:string):Promise<ProductRow[]>{const q=query.trim();let request=supabase.from('pos_products').select('*').eq('merchant_id',merchantId).is('archived_at',null).eq('active',true);if(q)request=request.or(`name.ilike.%${q.replaceAll(',','')}%,sku.ilike.%${q.replaceAll(',','')}%,barcode.eq.${q.replaceAll(',','')}`);const{data,error}=await request.order('name').limit(60);if(error)throw error;return(data||[])as ProductRow[]}
export async function getRefundableOrders(merchantId:string):Promise<OrderRow[]>{const{data,error}=await supabase.from('pos_orders').select('id,order_number,customer_name,customer_phone,source,fulfillment,table_label,delivery_address,status,payment_status,subtotal,delivery_fee,total,created_at,updated_at,pos_order_items(id,product_name,quantity,note,line_total),pos_payments(id,method,amount,status,reference_number,created_at)').eq('merchant_id',merchantId).eq('payment_status','paid').order('created_at',{ascending:false}).limit(50);if(error)throw error;return(data||[])as unknown as OrderRow[]}
export async function getInventoryInsights(merchantId:string,days=30):Promise<InventoryInsight[]>{const{data,error}=await supabase.rpc('pos_inventory_insights',{p_merchant_id:merchantId,p_days:days});if(error)throw error;return(data||[])as InventoryInsight[]}
export async function getOutletFulfillment(outletId:string):Promise<OutletFulfillment>{const{data,error}=await supabase.from('pos_outlets').select('id,name,pickup_enabled,delivery_enabled,delivery_fee,minimum_delivery_order').eq('id',outletId).single();if(error)throw error;return data as OutletFulfillment}
export async function updateOutletFulfillment(input:{outletId:string;pickupEnabled:boolean;deliveryEnabled:boolean;deliveryFee:number;minimumOrder:number}){const{data,error}=await supabase.rpc('pos_update_outlet_fulfillment',{p_outlet_id:input.outletId,p_pickup_enabled:input.pickupEnabled,p_delivery_enabled:input.deliveryEnabled,p_delivery_fee:input.deliveryFee,p_minimum_order:input.minimumOrder});if(error)throw error;return data}
