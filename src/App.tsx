import GuestOrdering from './GuestOrdering'
import LaunchCenter from './LaunchCenter'
import MerchantApp from './MerchantApp'
import OperationsHub from './OperationsHub'
import RegistrationGate from './RegistrationGate'
import RetailWorkspace from './RetailWorkspace'
import './advancedOps.css'

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const storeSlug = params.get('store')?.trim().toLowerCase() || ''
  const path = window.location.pathname.replace(/\/+$/, '')

  if (storeSlug) return <GuestOrdering slug={storeSlug} />
  if (path.endsWith('/retail')) return <RegistrationGate><RetailWorkspace /></RegistrationGate>
  if (path.endsWith('/operations')) return <RegistrationGate><OperationsHub /></RegistrationGate>
  if (path.endsWith('/launch') || path.endsWith('/billing') || path.endsWith('/refunds')) return <RegistrationGate><LaunchCenter /></RegistrationGate>
  return <RegistrationGate><MerchantApp /></RegistrationGate>
}
