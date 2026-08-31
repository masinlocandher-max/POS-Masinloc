import { supabase } from './supabase'
import type { PaymentMethod } from './posApi'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const extensionFor = (type: string) => type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'

export async function uploadPaymentQr(input: { merchantId: string; outletId: string; method: PaymentMethod; file: File }) {
  if (!allowedTypes.has(input.file.type)) throw new Error('Use a JPG, PNG, or WebP image.')
  if (input.file.size > 5 * 1024 * 1024) throw new Error('Payment QR image must be 5 MB or smaller.')
  const path = `${input.merchantId}/${input.outletId}/${input.method}/${crypto.randomUUID()}.${extensionFor(input.file.type)}`
  const { error } = await supabase.storage.from('pos-payment-assets').upload(path, input.file, { cacheControl: '3600', upsert: false, contentType: input.file.type })
  if (error) throw error
  return path
}

export async function removePaymentQr(path: string) {
  const { error } = await supabase.storage.from('pos-payment-assets').remove([path])
  if (error) throw error
}
