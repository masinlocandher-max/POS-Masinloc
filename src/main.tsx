import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import RegistrationGate from './RegistrationGate'
import StagingGate from './StagingGate'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StagingGate>
      <RegistrationGate>
        <App />
      </RegistrationGate>
    </StagingGate>
  </React.StrictMode>,
)
