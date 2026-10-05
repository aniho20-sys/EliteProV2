import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { installErrorReporting } from './utils/errorReporter'
import { installStaleChunkRecovery } from './utils/lazyPage'

// A shared booking link is /book/<slug> (so its link preview can name the coach —
// functions/bookingPreview.js). If the app shell is served for it anyway — a cached copy, or
// the preview function forwarding without its script — move to the hash route the app uses.
const bookingPath = window.location.pathname.match(/^\/book\/([a-z0-9]{10})\/?$/);
if (bookingPath) window.location.replace(`/#/book/${bookingPath[1]}`);

// Before the first render, so an error during it is caught too.
installErrorReporting()
installStaleChunkRecovery()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
