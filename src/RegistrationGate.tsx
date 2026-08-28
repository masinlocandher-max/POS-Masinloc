import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock3, FileCheck2, ShieldCheck, Store, XCircle } from 'lucide-react'
import './registration.css'

type GateView = 'welcome' | 'register' | 'pending' | 'approved' | 'rejected'

type Application = {
  ownerName: string
  businessName: string
  businessType: string
  barangay: string
  address: string
  mobile: string
  proofName: string
}

const emptyApplication: Application = {
  ownerName: '',
  businessName: '',
  businessType: 'Restaurant',
  barangay: '',
  address: '',
  mobile: '',
  proofName: '',
}

function MasinlocBrand() {
  return (
    <div className="registration-brand" aria-label="Masinloc Zambales">
      <div className="registration-mark"><span /><span /><span /><span /></div>
      <div><strong>MASINLOC</strong><small>ZAMBALES</small></div>
    </div>
  )
}

function RegistrationGate({ children }: { children: ReactNode }) {
  const localPreview = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const adminPreview = localPreview && new URLSearchParams(window.location.search).get('admin') === '1'
  const [view, setView] = useState<GateView>(adminPreview ? 'pending' : 'welcome')
  const [application, setApplication] = useState<Application>(adminPreview ? {
    ownerName: 'Juan Dela Cruz',
    businessName: 'ABC Café',
    businessType: 'Restaurant',
    barangay: 'Masinloc',
    address: 'Masinloc, Zambales',
    mobile: '0917 123 4567',
    proofName: 'business-permit.jpg',
  } : emptyApplication)
  const [adminDecision, setAdminDecision] = useState<'review' | 'approved' | 'rejected'>('review')

  if (adminPreview) {
    return (
      <div className="registration-shell">
        <header className="registration-header"><MasinlocBrand /><span className="admin-label">Admin Review</span></header>
        <main className="registration-main">
          <div className="review-heading">
            <div className="review-icon"><ShieldCheck /></div>
            <p className="registration-kicker">Merchant application</p>
            <h1>{application.businessName}</h1>
            <p>Review the applicant before activating free Masinloc POS access.</p>
          </div>

          <section className="review-card">
            <dl>
              <div><dt>Owner</dt><dd>{application.ownerName}</dd></div>
              <div><dt>Business type</dt><dd>{application.businessType}</dd></div>
              <div><dt>Barangay / locality</dt><dd>{application.barangay}</dd></div>
              <div><dt>Business address</dt><dd>{application.address}</dd></div>
              <div><dt>Mobile</dt><dd>{application.mobile}</dd></div>
              <div><dt>Verification file</dt><dd>{application.proofName}</dd></div>
            </dl>
          </section>

          <section className="why-review compact">
            <FileCheck2 />
            <div><strong>Approval standard</strong><p>Verify that the applicant is Masinloqueño and the business is genuinely operating in Masinloc. Also check for duplicate or fraudulent registrations.</p></div>
          </section>

          {adminDecision === 'review' && <div className="admin-actions"><button className="reject-button" onClick={() => setAdminDecision('rejected')}><XCircle /> Reject</button><button className="approve-button" onClick={() => setAdminDecision('approved')}><BadgeCheck /> Approve Business</button></div>}
          {adminDecision === 'approved' && <div className="decision approved"><CheckCircle2 /><div><strong>Business approved</strong><p>The merchant may now access Masinloc POS.</p></div></div>}
          {adminDecision === 'rejected' && <div className="decision rejected"><XCircle /><div><strong>Application rejected</strong><p>Access remains blocked until the applicant is verified.</p></div></div>}
        </main>
      </div>
    )
  }

  if (view === 'approved') return <>{children}</>

  if (view === 'pending') {
    return (
      <div className="registration-shell">
        <header className="registration-header"><MasinlocBrand /></header>
        <main className="registration-main pending-view">
          <div className="pending-icon"><Clock3 /></div>
          <p className="registration-kicker">Registration received</p>
          <h1>For review muna.</h1>
          <p className="registration-lead">Your business account is not active yet. Every registration is reviewed before Masinloc POS access is opened.</p>
          <section className="why-review">
            <ShieldCheck />
            <div><strong>Why is review needed?</strong><p>Masinloc POS is a free local benefit reserved for verified Masinloqueño-owned businesses operating in Masinloc. Review helps keep the benefit local and prevents fake, duplicate, or out-of-area registrations.</p></div>
          </section>
          <div className="review-checklist">
            <div><CheckCircle2 /><span>Owner identity and Masinloqueño eligibility</span></div>
            <div><CheckCircle2 /><span>Business name and Masinloc location</span></div>
            <div><CheckCircle2 /><span>Submitted verification document</span></div>
          </div>
          <button className="registration-secondary" onClick={() => setView('register')}>Edit registration</button>
        </main>
      </div>
    )
  }

  if (view === 'rejected') {
    return (
      <div className="registration-shell"><header className="registration-header"><MasinlocBrand /></header><main className="registration-main pending-view"><div className="pending-icon rejected-icon"><XCircle /></div><h1>Registration needs attention.</h1><p className="registration-lead">Your application could not be verified. Update your registration details or verification document, then submit again.</p><button className="registration-primary" onClick={() => setView('register')}>Update Registration</button></main></div>
    )
  }

  if (view === 'register') {
    return <RegistrationForm application={application} setApplication={setApplication} onBack={() => setView('welcome')} onSubmit={() => setView('pending')} />
  }

  return (
    <div className="registration-shell">
      <header className="registration-header"><MasinlocBrand /></header>
      <main className="registration-main welcome-view">
        <div className="merchant-symbol"><Store /></div>
        <p className="registration-kicker">Masinloc POS</p>
        <h1>Free restaurant tools for Masinloqueño businesses.</h1>
        <p className="registration-lead">Order taking, POS, kitchen, customer chat and basic loyalty. Built mobile-first for local restaurants, cafés, food businesses, resorts and hotels.</p>

        <section className="local-benefit"><BadgeCheck /><div><strong>Masinloqueño benefit</strong><p>Free access is for verified Masinloqueño-owned businesses operating in Masinloc, Zambales.</p></div></section>

        <button className="registration-primary" onClick={() => setView('register')}>Register Your Business</button>
        <p className="registration-note">Registration is reviewed by an admin before the business account is activated.</p>

        {localPreview && <button className="approved-preview" onClick={() => setView('approved')}>Preview approved merchant app</button>}
      </main>
    </div>
  )
}

function RegistrationForm({ application, setApplication, onBack, onSubmit }: {
  application: Application
  setApplication: (value: Application) => void
  onBack: () => void
  onSubmit: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const canSubmit = Boolean(application.ownerName.trim() && application.businessName.trim() && application.barangay.trim() && application.address.trim() && application.mobile.trim() && application.proofName && confirmed)

  const update = (key: keyof Application, value: string) => setApplication({ ...application, [key]: value })
  const submit = (event: FormEvent) => { event.preventDefault(); if (canSubmit) onSubmit() }

  return (
    <div className="registration-shell">
      <header className="registration-header"><button className="registration-back" onClick={onBack}><ArrowLeft /></button><MasinlocBrand /><span /></header>
      <main className="registration-main">
        <p className="registration-kicker">Business registration</p>
        <h1>Register for Masinloc POS</h1>
        <p className="registration-lead">Tell us about the business. An admin will review the application before access is activated.</p>

        <form className="registration-form" onSubmit={submit}>
          <label><span>Owner's full name</span><input value={application.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder="Full name" /></label>
          <label><span>Business name</span><input value={application.businessName} onChange={e => update('businessName', e.target.value)} placeholder="Restaurant or store name" /></label>
          <label><span>Business type</span><select value={application.businessType} onChange={e => update('businessType', e.target.value)}><option>Restaurant</option><option>Café</option><option>Food Stall</option><option>Bakery</option><option>Resort</option><option>Hotel</option><option>Other Food Business</option></select></label>
          <label><span>Barangay in Masinloc</span><input value={application.barangay} onChange={e => update('barangay', e.target.value)} placeholder="Barangay" /></label>
          <label><span>Business address</span><textarea value={application.address} onChange={e => update('address', e.target.value)} placeholder="Complete Masinloc business address" /></label>
          <label><span>Mobile number</span><input inputMode="tel" value={application.mobile} onChange={e => update('mobile', e.target.value)} placeholder="09XX XXX XXXX" /></label>
          <label><span>Proof of local business / ownership</span><input className="file-input" type="file" accept="image/*,.pdf" onChange={e => update('proofName', e.target.files?.[0]?.name || '')} /><small>Business permit, barangay certification, or another document that helps verify the Masinloc business.</small></label>

          <section className="why-review compact form-review"><ShieldCheck /><div><strong>Why do we verify?</strong><p>This free service is reserved for Masinloqueño businesses. Review protects the community benefit from fake, duplicate and non-local registrations.</p></div></section>

          <label className="confirmation"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>I confirm that I am a Masinloqueño and this business operates in Masinloc, Zambales.</span></label>

          <button className="registration-primary" disabled={!canSubmit}>Submit for Review</button>
        </form>
      </main>
    </div>
  )
}

export default RegistrationGate
