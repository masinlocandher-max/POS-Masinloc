import { supabase } from './supabase'

export type OutletInventoryRow={merchant_id:string;outlet_id:string;product_id:string;quantity:number;low_stock_threshold:number;updated_at:string}
export type StockTransferRow={id:string;merchant_id:string;from_outlet_id:string;to_outlet_id:string;product_id:string;quantity:number;status:string;note:string|null;created_at:string}
export type PurchaseOrderItemRow={id:string;purchase_order_id:string;merchant_id:string;product_id:string;quantity:number;received_quantity:number;unit_cost:number|null}
export type BillingCheckout={checkout_id:string;amount:number;currency:string;status:string}

export async function getOutletInventory(merchantId:string,outletId:string){
 const {data,error}=await supabase.from('pos_outlet_inventory').select('*').eq('merchant_id',merchantId).eq('outlet_id',outletId).order('updated_at',{ascending:false}); if(error)throw error; return (data||[]) as OutletInventoryRow[]
}
export async function transferStock(input:{merchantId:string;fromOutletId:string;toOutletId:string;productId:string;quantity:number;note?:string}){
 const {data,error}=await supabase.rpc('pos_transfer_stock',{p_merchant_id:input.merchantId,p_from_outlet_id:input.fromOutletId,p_to_outlet_id:input.toOutletId,p_product_id:input.productId,p_quantity:input.quantity,p_note:input.note||null}); if(error)throw error; return data as string
}
export async function getPurchaseOrderItems(purchaseOrderId:string){const {data,error}=await supabase.from('pos_purchase_order_items').select('*').eq('purchase_order_id',purchaseOrderId);if(error)throw error;return (data||[]) as PurchaseOrderItemRow[]}
export async function addPurchaseOrderItem(input:{purchaseOrderId:string;productId:string;quantity:number;unitCost?:number}){const {data,error}=await supabase.rpc('pos_add_purchase_order_item',{p_purchase_order_id:input.purchaseOrderId,p_product_id:input.productId,p_quantity:input.quantity,p_unit_cost:input.unitCost??null});if(error)throw error;return data as string}
export async function receivePurchaseOrder(purchaseOrderId:string,items:Array<{item_id:string;quantity:number}>){const {data,error}=await supabase.rpc('pos_receive_purchase_order',{p_purchase_order_id:purchaseOrderId,p_items:items});if(error)throw error;return data as {purchase_order_id:string;status:string}}
export async function createRetailOrder(input:{merchantId:string;outletId:string;items:Array<{product_id:string;quantity:number;unit_price?:number}>;paymentMethod:string;discount?:number;customerName?:string}){const {data,error}=await supabase.rpc('pos_create_retail_order',{p_merchant_id:input.merchantId,p_outlet_id:input.outletId,p_items:input.items,p_payment_method:input.paymentMethod,p_discount:input.discount||0,p_customer_name:input.customerName||'Walk-in'});if(error)throw error;return data as {order_id:string;order_number:number;subtotal:number;discount:number;total:number}}
export async function createBillingCheckout(merchantId:string,plan:'pro'|'business_plus',period:'monthly'|'annual'){const {data,error}=await supabase.rpc('pos_create_billing_checkout',{p_merchant_id:merchantId,p_plan:plan,p_period:period});if(error)throw error;return data as BillingCheckout}
