import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import MerchantMvp from './MerchantMvp'
import RegistrationGate from './RegistrationGate'
import StagingGate from './StagingGate'
import './styles.css'

const normalizedPath = window.location.pathname.replace(/\/+$/, '')
const isMerchantMvp = normalizedPath.endsWith('/business') || normalizedPath.endsWith('/merchant')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StagingGate>
      <RegistrationGate>
        {isMerchantMvp ? <MerchantMvp /> : <App />}
      </RegistrationGate>
    </StagingGate>
  </React.StrictMode>,
)
