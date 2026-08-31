import { createClient } from '@supabase/supabase-js'

const fallbackUrl = 'https://uwcqvsitjtknxsaypjxj.supabase.co'
const fallbackPublishableKey = 'sb_publishable_qsC-udp3YoJQFuE-lHPivg_wa8gYMeg'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const posOrderEndpoint = `${supabaseUrl}/functions/v1/pos-order`
