import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppBootstrap from './components/AppBootstrap.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppBootstrap>
      <App />
    </AppBootstrap>
  </StrictMode>,
)
