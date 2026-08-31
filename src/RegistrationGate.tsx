import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock3, FileCheck2, LogIn, LogOut, MailCheck, RefreshCw, ShieldCheck, Store, UserPlus, XCircle } from 'lucide-react'
import { supabase } from './lib/supabase'
import {
  authApi,
  getAccessApplication,
  getAccessApplicationsForReview,
  getMerchantContexts,
  isPlatformAdmin,
  reviewAccessApplication,
  submitAccessApplication,
  type AccessApplication,
  type AccessApplicationInput,
  type AccessApplicationStatus,
} from './lib/posApi'
import './registration.css'

type GateView = 'welcome' | 'sign-up' | 'sign-in' | 'application' | 'confirmation'

const BARANGAYS = [
  'Baloganon',
  'Bamban',
  'Bani',
  'Collat',
  'Inhobol',
  'North Poblacion',
  'San Lorenzo',
  'San Salvador',
  'Santa Rita',
  'Santo Rosario',
  'South Poblacion',
  'Taltal',
  'Tapuac',
] as const

const emptyApplication: AccessApplicationInput = {
  ownerName: '',
  businessName: '',
  businessType: 'Restaurant',
  barangay: '',
  businessAddress: '',
  mobile: '',
  eligibilityConfirmed: false,
}

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return 'Something went wrong. Please try again.'
}

function toDraft(application: AccessApplication | null): AccessApplicationInput {
  if (!application) return emptyApplication
  return {
    ownerName: application.owner_name,
    businessName: application.business_name,
    businessType: application.business_type,
    barangay: application.barangay,
    businessAddress: application.business_address,
    mobile: application.mobile,
    eligibilityConfirmed: application.eligibility_confirmed,
  }
}

function MasinlocBrand() {
  return (
    <div className="registration-brand" aria-label="Masinloc Zambales">
      <div className="registration-mark"><span /><span /><span /><span /></div>
      <div><strong>MASINLOC</strong><small>POS · ZAMBALES</small></div>
    </div>
  )
}

export default function RegistrationGate({ children }: { children: ReactNode }) {
  const [view, setView] = useState<GateView>('welcome')
  const [session, setSession] = useState<Session | null>(null)
  const [application, setApplication] = useState<AccessApplication | null>(null)
  const [hasMerchant, setHasMerchant] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState('')
  const adminRequested = new URLSearchParams(window.location.search).get('admin') === '1'

  const loadAccess = async () => {
    setBooting(true)
    setError('')
    try {
      const current = await authApi.session()
      setSession(current)
      if (!current) {
        setApplication(null)
        setHasMerchant(false)
        setIsAdmin(false)
        return
      }

      const [contexts, ownApplication, admin] = await Promise.all([
        getMerchantContexts(),
        getAccessApplication(),
        isPlatformAdmin(),
      ])
      setHasMerchant(contexts.length > 0)
      setApplication(ownApplication)
      setIsAdmin(admin)
      setView(contexts.length || ownApplication ? 'welcome' : 'application')
    } catch (nextError) {
      setError(messageOf(nextError))
    } finally {
      setBooting(false)
    }
  }

  useEffect(() => {
    void loadAccess()
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        window.setTimeout(() => void loadAccess(), 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (booting) {
    return <div className="registration-shell"><div className="registration-loading"><div className="spinner" /><strong>Checking POS access…</strong></div></div>
  }

  if (!session) {
    if (view === 'sign-up') return <AccountForm mode="sign-up" onBack={() => setView('welcome')} onAuthenticated={loadAccess} onConfirmation={() => setView('confirmation')} onError={setError} />
    if (view === 'sign-in') return <AccountForm mode="sign-in" onBack={() => setView('welcome')} onAuthenticated={loadAccess} onConfirmation={() => setView('confirmation')} onError={setError} />
    if (view === 'confirmation') return <EmailConfirmation onSignIn={() => setView('sign-in')} />
    return <Welcome onRegister={() => setView('sign-up')} onSignIn={() => setView('sign-in')} error={error} />
  }

  const signOut = async () => {
    try {
      await authApi.signOut()
      setView('welcome')
    } catch (nextError) {
      setError(messageOf(nextError))
    }
  }

  if (isAdmin && (adminRequested || !hasMerchant)) return <AdminReview onSignOut={signOut} />
  if (hasMerchant) return <>{children}</>

  if (view === 'application' || !application) {
    return (
      <RegistrationForm
        application={application}
        email={session.user.email || ''}
        onBack={application ? () => setView('welcome') : undefined}
        onSubmitted={loadAccess}
        onSignOut={signOut}
      />
    )
  }

  return (
    <ApplicationStatus
      application={application}
      error={error}
      onEdit={application.status === 'under_review' || application.status === 'approved' ? undefined : () => setView('application')}
      onRefresh={loadAccess}
      onSignOut={signOut}
    />
  )
}

function Welcome({ onRegister, onSignIn, error }: { onRegister: () => void; onSignIn: () => void; error: string }) {
  return (
    <div className="registration-shell">
      <header className="registration-header"><MasinlocBrand /></header>
      <main className="registration-main welcome-view">
        <div className="merchant-symbol"><Store /></div>
        <p className="registration-kicker">Masinloc POS</p>
        <h1>Local business tools, connected to real operations.</h1>
        <p className="registration-lead">Create an account and submit your Masinloc business for review. Approved owners and staff can sign in to their live POS workspace.</p>
        {error && <div className="registration-inline-error">{error}</div>}
        <section className="local-benefit"><BadgeCheck /><div><strong>Masinloqueño benefit</strong><p>Community Free access is reserved for verified Masinloqueño-owned businesses operating in Masinloc, Zambales.</p></div></section>
        <div className="registration-actions">
          <button className="registration-primary" onClick={onRegister}><UserPlus /> Create merchant account</button>
          <button className="registration-secondary" onClick={onSignIn}><LogIn /> Sign in</button>
        </div>
        <p className="registration-note">Every application is reviewed before a merchant workspace is activated.</p>
      </main>
    </div>
  )
}

function AccountForm({ mode, onBack, onAuthenticated, onConfirmation, onError }: {
  mode: 'sign-up' | 'sign-in'
  onBack: () => void
  onAuthenticated: () => Promise<void>
  onConfirmation: () => void
  onError: (message: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const creating = mode === 'sign-up'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError('')
    if (creating && password !== confirmation) {
      setLocalError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (creating) {
        const result = await authApi.signUp(email.trim(), password)
        if (!result.session) {
          onConfirmation()
          return
        }
      } else {
        await authApi.signIn(email.trim(), password)
      }
      await onAuthenticated()
    } catch (nextError) {
      const nextMessage = messageOf(nextError)
      setLocalError(nextMessage)
      onError(nextMessage)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="registration-shell">
      <header className="registration-header"><button className="registration-back" onClick={onBack} aria-label="Back"><ArrowLeft /></button><MasinlocBrand /><span /></header>
      <main className="registration-main">
        <p className="registration-kicker">{creating ? 'Merchant account' : 'Approved merchant or staff'}</p>
        <h1>{creating ? 'Create your account' : 'Sign in to Masinloc POS'}</h1>
        <p className="registration-lead">{creating ? 'Use an email address you can verify. Your business application comes next.' : 'Use the email and password connected to your merchant membership.'}</p>
        {localError && <div className="registration-inline-error">{localError}</div>}
        <form className="registration-form" onSubmit={submit}>
          <label><span>Email address</span><input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label><span>Password</span><input type="password" required minLength={8} autoComplete={creating ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
          {creating && <label><span>Confirm password</span><input type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Repeat your password" /></label>}
          <button className="registration-primary" disabled={busy}>{busy ? 'Please wait…' : creating ? 'Continue to business details' : 'Sign in'}</button>
        </form>
      </main>
    </div>
  )
}

function EmailConfirmation({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="registration-shell">
      <header className="registration-header"><MasinlocBrand /></header>
      <main className="registration-main pending-view">
        <div className="pending-icon confirmation-icon"><MailCheck /></div>
        <p className="registration-kicker">Verify your email</p>
        <h1>Check your inbox.</h1>
        <p className="registration-lead">Open the confirmation link sent by Supabase, then return here and sign in to complete your business application.</p>
        <button className="registration-primary" onClick={onSignIn}><LogIn /> Sign in after confirming</button>
      </main>
    </div>
  )
}

type ReviewDecision = Exclude<AccessApplicationStatus, 'submitted'>

function AdminReview({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const [applications, setApplications] = useState<AccessApplication[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const next = await getAccessApplicationsForReview()
      setApplications(next)
      setSelectedId(current => current && next.some(item => item.id === current)
        ? current
        : next.find(item => item.status === 'submitted' || item.status === 'under_review')?.id || next[0]?.id || null)
    } catch (nextError) {
      setError(messageOf(nextError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const selected = applications.find(item => item.id === selectedId) || null
  const queued = applications.filter(item => item.status === 'submitted' || item.status === 'under_review').length
  const decide = async (decision: ReviewDecision) => {
    if (!selected || busy) return
    if ((decision === 'needs_changes' || decision === 'rejected') && reason.trim().length < 3) {
      setError('Add a review reason before requesting changes or rejecting an application.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await reviewAccessApplication(selected.id, decision, reason)
      setNotice(`${selected.business_name} was marked ${decision.replace('_', ' ')}.`)
      setReason('')
      await load()
    } catch (nextError) {
      setError(messageOf(nextError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="registration-shell">
      <header className="registration-header admin-review-header"><MasinlocBrand /><span className="admin-label">Admin Review</span><button className="registration-header-action" onClick={() => void onSignOut()} aria-label="Sign out"><LogOut /></button></header>
      <main className="registration-main">
        <div className="review-heading">
          <div className="review-icon"><ShieldCheck /></div>
          <p className="registration-kicker">Verified admin workspace</p>
          <h1>Merchant review queue</h1>
          <p>{queued} application{queued === 1 ? '' : 's'} currently waiting for a decision.</p>
        </div>
        {error && <div className="registration-inline-error">{error}</div>}
        {notice && <div className="registration-inline-notice">{notice}</div>}
        {loading ? <div className="registration-loading compact"><div className="spinner" /><strong>Loading applications…</strong></div> : applications.length === 0 ? <div className="review-empty"><FileCheck2 /><strong>No applications yet.</strong><span>New merchant submissions will appear here.</span></div> : <>
          <div className="admin-application-list" aria-label="Merchant applications">
            {applications.map(item => <button key={item.id} className={item.id === selectedId ? 'selected' : ''} onClick={() => { setSelectedId(item.id); setReason(item.review_notes || ''); setError(''); setNotice('') }}>
              <span><strong>{item.business_name}</strong><small>{item.owner_name} · {item.barangay}</small></span>
              <b className={`application-status status-${item.status}`}>{item.status.replace('_', ' ')}</b>
            </button>)}
          </div>
          {selected && <section className="admin-review-detail">
            <div className="review-card">
              <dl>
                <div><dt>Owner</dt><dd>{selected.owner_name}</dd></div>
                <div><dt>Contact</dt><dd>{selected.contact_email}<br />{selected.mobile}</dd></div>
                <div><dt>Business type</dt><dd>{selected.business_type}</dd></div>
                <div><dt>Barangay</dt><dd>{selected.barangay}</dd></div>
                <div><dt>Business address</dt><dd>{selected.business_address}</dd></div>
                <div><dt>Eligibility confirmed</dt><dd>{selected.eligibility_confirmed ? 'Yes' : 'No'}</dd></div>
              </dl>
            </div>
            <label className="review-reason"><span>Review note</span><textarea maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} placeholder="Required when requesting changes or rejecting" /></label>
            {selected.status === 'approved' ? <div className="decision approved"><CheckCircle2 /><div><strong>Business approved</strong><p>The merchant workspace and owner membership have been created.</p></div></div> : <div className="admin-review-actions">
              {selected.status === 'submitted' && <button className="reviewing-button" disabled={busy} onClick={() => void decide('under_review')}><Clock3 /> Mark reviewing</button>}
              <button className="changes-button" disabled={busy || reason.trim().length < 3} onClick={() => void decide('needs_changes')}>Request changes</button>
              <button className="reject-button" disabled={busy || reason.trim().length < 3} onClick={() => void decide('rejected')}><XCircle /> Reject</button>
              <button className="approve-button" disabled={busy} onClick={() => void decide('approved')}><BadgeCheck /> Approve business</button>
            </div>}
          </section>}
        </>}
      </main>
    </div>
  )
}

function RegistrationForm({ application, email, onBack, onSubmitted, onSignOut }: {
  application: AccessApplication | null
  email: string
  onBack?: () => void
  onSubmitted: () => Promise<void>
  onSignOut: () => Promise<void>
}) {
  const [draft, setDraft] = useState(() => toDraft(application))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = Boolean(
    draft.ownerName.trim().length >= 2 &&
    draft.businessName.trim().length >= 2 &&
    draft.businessType.trim().length >= 2 &&
    BARANGAYS.includes(draft.barangay as typeof BARANGAYS[number]) &&
    draft.businessAddress.trim().length >= 5 &&
    draft.mobile.trim().length >= 7 &&
    draft.eligibilityConfirmed
  )

  const update = <K extends keyof AccessApplicationInput>(key: K, value: AccessApplicationInput[K]) => setDraft(current => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    setError('')
    try {
      await submitAccessApplication(draft)
      await onSubmitted()
    } catch (nextError) {
      setError(messageOf(nextError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="registration-shell">
      <header className="registration-header">{onBack ? <button className="registration-back" onClick={onBack} aria-label="Back"><ArrowLeft /></button> : <span />}<MasinlocBrand /><button className="registration-header-action" onClick={() => void onSignOut()} aria-label="Sign out"><LogOut /></button></header>
      <main className="registration-main">
        <p className="registration-kicker">Business registration</p>
        <h1>{application ? 'Update your application' : 'Register for Masinloc POS'}</h1>
        <p className="registration-lead">The signed-in account is <strong>{email}</strong>. An admin will review these details before activating access.</p>
        {error && <div className="registration-inline-error">{error}</div>}
        <form className="registration-form" onSubmit={submit}>
          <label><span>Owner's full name</span><input required minLength={2} maxLength={160} value={draft.ownerName} onChange={event => update('ownerName', event.target.value)} placeholder="Full name" /></label>
          <label><span>Business name</span><input required minLength={2} maxLength={120} value={draft.businessName} onChange={event => update('businessName', event.target.value)} placeholder="Restaurant or store name" /></label>
          <label><span>Business type</span><select value={draft.businessType} onChange={event => update('businessType', event.target.value)}><option>Restaurant</option><option>Café</option><option>Food Stall</option><option>Bakery</option><option>Resort</option><option>Hotel</option><option>Retail Store</option><option>Service Business</option><option>Other Local Business</option></select></label>
          <label><span>Barangay in Masinloc</span><select required value={draft.barangay} onChange={event => update('barangay', event.target.value)}><option value="">Select a barangay</option>{BARANGAYS.map(barangay => <option key={barangay}>{barangay}</option>)}</select></label>
          <label><span>Business address</span><textarea required minLength={5} maxLength={500} value={draft.businessAddress} onChange={event => update('businessAddress', event.target.value)} placeholder="Complete Masinloc business address" /></label>
          <label><span>Mobile number</span><input required minLength={7} maxLength={40} inputMode="tel" autoComplete="tel" value={draft.mobile} onChange={event => update('mobile', event.target.value)} placeholder="09XX XXX XXXX" /></label>
          <section className="why-review compact form-review"><ShieldCheck /><div><strong>Why do we verify?</strong><p>Community Free is a local benefit. Review protects it from fake, duplicate, and non-local registrations.</p></div></section>
          <label className="confirmation"><input type="checkbox" checked={draft.eligibilityConfirmed} onChange={event => update('eligibilityConfirmed', event.target.checked)} /><span>I confirm that I am a Masinloqueño and this business operates in Masinloc, Zambales.</span></label>
          <button className="registration-primary" disabled={!canSubmit || busy}>{busy ? 'Submitting…' : application ? 'Resubmit for review' : 'Submit for review'}</button>
        </form>
      </main>
    </div>
  )
}

function ApplicationStatus({ application, error, onEdit, onRefresh, onSignOut }: {
  application: AccessApplication
  error: string
  onEdit?: () => void
  onRefresh: () => Promise<void>
  onSignOut: () => Promise<void>
}) {
  const needsChanges = application.status === 'needs_changes' || application.status === 'rejected'
  const approved = application.status === 'approved'
  const underReview = application.status === 'under_review'
  const icon = needsChanges ? <XCircle /> : approved ? <CheckCircle2 /> : <Clock3 />
  const title = needsChanges ? 'Registration needs attention.' : approved ? 'Your business is approved.' : underReview ? 'Your application is under review.' : 'Registration received.'
  const body = needsChanges
    ? 'Review the note below, update the business details, and submit again.'
    : approved
      ? 'The merchant workspace is being linked. Refresh access in a moment.'
      : 'Your POS workspace stays locked until an admin verifies the application.'

  return (
    <div className="registration-shell">
      <header className="registration-header"><MasinlocBrand /><button className="registration-header-action" onClick={() => void onSignOut()} aria-label="Sign out"><LogOut /></button></header>
      <main className="registration-main pending-view">
        <div className={`pending-icon ${needsChanges ? 'rejected-icon' : approved ? 'approved-icon' : ''}`}>{icon}</div>
        <p className="registration-kicker">Application status · {application.status.replace('_', ' ')}</p>
        <h1>{title}</h1>
        <p className="registration-lead">{body}</p>
        {error && <div className="registration-inline-error">{error}</div>}
        {application.review_notes && <section className="review-note"><strong>Reviewer note</strong><p>{application.review_notes}</p></section>}
        <section className="review-card application-summary">
          <dl>
            <div><dt>Business</dt><dd>{application.business_name}</dd></div>
            <div><dt>Owner</dt><dd>{application.owner_name}</dd></div>
            <div><dt>Location</dt><dd>{application.barangay}, Masinloc</dd></div>
            <div><dt>Submitted</dt><dd>{new Date(application.submitted_at).toLocaleDateString()}</dd></div>
          </dl>
        </section>
        <div className="registration-actions status-actions">
          {onEdit && <button className="registration-primary" onClick={onEdit}>{needsChanges ? 'Update application' : 'Update submitted details'}</button>}
          <button className={onEdit ? 'registration-secondary' : 'registration-primary'} onClick={() => void onRefresh()}><RefreshCw /> Refresh access</button>
        </div>
      </main>
    </div>
  )
}
