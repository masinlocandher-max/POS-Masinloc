import GuestOrdering from './GuestOrdering'
import MerchantApp from './MerchantApp'
import RegistrationGate from './RegistrationGate'

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const storeSlug = params.get('store')?.trim().toLowerCase() || ''

  if (storeSlug) return <GuestOrdering slug={storeSlug} />
  return <RegistrationGate><MerchantApp /></RegistrationGate>
}
