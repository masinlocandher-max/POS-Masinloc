import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { KeyRound, Lock } from 'lucide-react'
import './staging.css'

/**
 * Private-staging lock.
 *
 * The build is deployable but must not be publicly usable yet, so nothing
 * renders until a staging access code is entered. This is deliberately a
 * *deterrent*, not an authorization boundary: the code ships in the bundle,
 * so anyone determined can read it. Real protection has to come from the host
 * (Cloudflare Access, HTTP basic auth, an IP allowlist) — see
 * docs/DEPLOYMENT.md. The same rule already stated for merchant approval in
 * docs/REGISTRATION_AND_ACCESS.md applies here: never treat client-side state
 * as authorization.
 */

const STORAGE_KEY = 'masinloc-pos.staging-unlocked'

const configuredCode = (import.meta.env.VITE_STAGING_ACCESS_CODE ?? '').trim()
const publicLaunch = (import.meta.env.VITE_PUBLIC_LAUNCH ?? '').trim() === 'true'

const readUnlocked = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function StagingGate({ children }: { children: ReactNode }) {
  // At public launch, set VITE_PUBLIC_LAUNCH=true and the lock disappears.
  // With no code configured the lock also stays out of the way, so `npm run
  // dev` is not gated for whoever is building the app.
  const bypass = publicLaunch || configuredCode === ''

  const [unlocked, setUnlocked] = useState(() => bypass || readUnlocked())
  const [entry, setEntry] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!unlocked || bypass) return
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      /* private browsing — the unlock just does not persist across reloads */
    }
  }, [unlocked, bypass])

  if (unlocked) return <>{children}</>

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (entry.trim() === configuredCode) {
      setUnlocked(true)
      return
    }
    setError('That code is not recognised. Ask the Masinloc POS team for the current staging code.')
    setEntry('')
  }

  return (
    <div className="staging-shell">
      <main className="staging-card">
        <div className="staging-icon"><Lock /></div>
        <p className="staging-kicker">Private staging</p>
        <h1>Masinloc POS is not open to the public yet.</h1>
        <p className="staging-lead">
          This build is for the Masinloc project team while the app is being reviewed.
          Enter the staging access code to continue.
        </p>

        <form className="staging-form" onSubmit={submit}>
          <label htmlFor="staging-code">Staging access code</label>
          <div className="staging-input">
            <KeyRound aria-hidden="true" />
            <input
              id="staging-code"
              type="password"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={entry}
              onChange={event => { setEntry(event.target.value); setError('') }}
              placeholder="Enter code"
            />
          </div>
          {error && <p className="staging-error" role="alert">{error}</p>}
          <button className="staging-button" disabled={!entry.trim()}>Unlock staging</button>
        </form>

        <p className="staging-note">
          Restaurants cannot register yet. Public onboarding opens after the review is finished.
        </p>
      </main>
    </div>
  )
}

export default StagingGate
