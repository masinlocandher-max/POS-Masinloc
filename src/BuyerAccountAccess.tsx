import { FormEvent, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { MailCheck, MessageCircle, ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return 'Could not send the sign-in link.'
}

function redirectUrl() {
  const url = new URL(window.location.href)
  url.hash = ''
  return url.toString()
}

export default function BuyerAccountAccess({ compact = false }: { compact?: boolean }) {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { if (mounted) setSession(next) })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [])

  if (session) {
    return <div className={compact ? 'payment-note' : 'guardrail-note'}><ShieldCheck /><p><strong>Messaging account active.</strong><br />{session.user.email || 'Signed-in buyer'} can message the seller about this order.</p></div>
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !email.trim()) return
    setBusy(true)
    setError('')
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: redirectUrl() },
      })
      if (otpError) throw otpError
      setSent(true)
    } catch (nextError) {
      setError(messageOf(nextError))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return <div className={compact ? 'payment-note' : 'guardrail-note'}><MailCheck /><p><strong>Check your email.</strong><br />Open the one-time link we sent to {email.trim()} to activate order messaging.</p></div>
  }

  return <div className={compact ? 'buyer-account compact' : 'buyer-account'}>
    <div className="section-title"><h2>Want to message the seller?</h2><MessageCircle /></div>
    <p className="body-copy">Use a free buyer account. Chat is available before payment confirmation, but anonymous messaging is disabled to prevent abuse.</p>
    {error && <div className="inline-error">{error}</div>}
    <form className="chat-compose" onSubmit={submit}>
      <input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Your email" />
      <button disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Send sign-in link'}</button>
    </form>
  </div>
}
