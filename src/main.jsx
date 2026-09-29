import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { installErrorReporting } from './utils/errorReporter'
import { installStaleChunkRecovery } from './utils/lazyPage'

// Before the first render, so an error during it is caught too.
installErrorReporting()
installStaleChunkRecovery()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
