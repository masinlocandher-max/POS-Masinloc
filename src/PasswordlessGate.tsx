import { FormEvent, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, LogIn, MailCheck, ShieldCheck, Store, UserPlus } from 'lucide-react'
import RegistrationGate from './RegistrationGate'
import { supabase } from './lib/supabase'
import './registration.css'

type Mode = 'register' | 'signin'

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return 'Something went wrong. Please try again.'
}

function MasinlocBrand() {
  return (
    <div className="registration-brand" aria-label="Masinloc Zambales">
      <div className="registration-mark"><span /><span /><span /><span /></div>
      <div><strong>MASINLOC</strong><small>POS · ZAMBALES</small></div>
    </div>
  )
}

function currentRedirectUrl() {
  const url = new URL(window.location.href)
  url.hash = ''
  return url.toString()
}

export default function PasswordlessGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [booting, setBooting] = useState(true)
  const [mode, setMode] = useState<Mode | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setBooting(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setBooting(false)
    })
    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (booting) {
    return <div className="registration-shell"><div className="registration-loading"><div className="spinner" /><strong>Checking secure access…</strong></div></div>
  }

  if (session) return <RegistrationGate>{children}</RegistrationGate>

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!mode || busy) return
    setBusy(true)
    setError('')
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: mode === 'register',
          emailRedirectTo: currentRedirectUrl(),
        },
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
    return (
      <div className="registration-shell">
        <header className="registration-header"><MasinlocBrand /></header>
        <main className="registration-main pending-view">
          <div className="pending-icon confirmation-icon"><MailCheck /></div>
          <p className="registration-kicker">Passwordless access</p>
          <h1>Check your inbox.</h1>
          <p className="registration-lead">We sent a one-time sign-in link to <strong>{email.trim()}</strong>. Open it on this device to continue. No POS password is required.</p>
          <button className="registration-secondary" onClick={() => { setSent(false); setEmail('') }}>Use another email</button>
        </main>
      </div>
    )
  }

  if (mode) {
    const creating = mode === 'register'
    return (
      <div className="registration-shell">
        <header className="registration-header"><button className="registration-back" onClick={() => { setMode(null); setError('') }} aria-label="Back"><ArrowLeft /></button><MasinlocBrand /><span /></header>
        <main className="registration-main">
          <p className="registration-kicker">{creating ? 'Merchant application' : 'Approved merchant or staff'}</p>
          <h1>{creating ? 'Start with your email' : 'Sign in to Masinloc POS'}</h1>
          <p className="registration-lead">{creating ? 'We will verify your email first, then you can submit your business details.' : 'Enter the email connected to your merchant or staff access. We will send a one-time sign-in link.'}</p>
          {error && <div className="registration-inline-error">{error}</div>}
          <form className="registration-form" onSubmit={submit}>
            <label><span>Email address</span><input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <button className="registration-primary" disabled={busy}>{busy ? 'Sending…' : 'Send secure sign-in link'}</button>
          </form>
          <p className="registration-note">The link is one-time use. Paid plans remain locked until payment is manually verified and activated.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="registration-shell">
      <header className="registration-header"><MasinlocBrand /></header>
      <main className="registration-main welcome-view">
        <div className="merchant-symbol"><Store /></div>
        <p className="registration-kicker">Masinloc POS</p>
        <h1>Run your business without paying for software first.</h1>
        <p className="registration-lead">Community Free is available for approved local merchants. Pro and Business+ stay locked until a paid upgrade is verified.</p>
        {error && <div className="registration-inline-error">{error}</div>}
        <section className="local-benefit"><ShieldCheck /><div><strong>Passwordless merchant access</strong><p>We use one-time email links instead of reusable POS passwords while the platform is on the Supabase Free plan.</p></div></section>
        <div className="registration-actions">
          <button className="registration-primary" onClick={() => { setMode('register'); setError('') }}><UserPlus /> Apply for Community Free</button>
          <button className="registration-secondary" onClick={() => { setMode('signin'); setError('') }}><LogIn /> Sign in</button>
        </div>
      </main>
    </div>
  )
}
