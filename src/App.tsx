import GuestOrdering from './GuestOrdering'
import MerchantApp from './MerchantApp'
import OperationsHub from './OperationsHub'
import RegistrationGate from './RegistrationGate'
import RetailWorkspace from './RetailWorkspace'

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const storeSlug = params.get('store')?.trim().toLowerCase() || ''
  const path = window.location.pathname.replace(/\/+$/, '')

  if (storeSlug) return <GuestOrdering slug={storeSlug} />
  if (path.endsWith('/retail')) return <RegistrationGate><RetailWorkspace /></RegistrationGate>
  if (path.endsWith('/operations')) return <RegistrationGate><OperationsHub /></RegistrationGate>
  return <RegistrationGate><MerchantApp /></RegistrationGate>
}
