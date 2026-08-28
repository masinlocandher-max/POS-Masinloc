import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import RegistrationGate from './RegistrationGate'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RegistrationGate>
      <App />
    </RegistrationGate>
  </React.StrictMode>,
)
