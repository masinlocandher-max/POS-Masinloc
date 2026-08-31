import GuestOrdering from './GuestOrdering'
import LaunchCenter from './LaunchCenter'
import MerchantApp from './MerchantApp'
import OperationsHub from './OperationsHub'
import PasswordlessGate from './PasswordlessGate'
import RetailWorkspace from './RetailWorkspace'
import './advancedOps.css'

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const storeSlug = params.get('store')?.trim().toLowerCase() || ''
  const path = window.location.pathname.replace(/\/+$/, '')

  if (storeSlug) return <GuestOrdering slug={storeSlug} />
  if (path.endsWith('/retail')) return <PasswordlessGate><RetailWorkspace /></PasswordlessGate>
  if (path.endsWith('/operations')) return <PasswordlessGate><OperationsHub /></PasswordlessGate>
  if (path.endsWith('/launch') || path.endsWith('/billing') || path.endsWith('/refunds')) return <PasswordlessGate><LaunchCenter /></PasswordlessGate>
  return <PasswordlessGate><MerchantApp /></PasswordlessGate>
}
