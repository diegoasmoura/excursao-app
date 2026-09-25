import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfirmProvider } from './context/ConfirmContext.jsx'
import { LayoutProvider } from './context/LayoutContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LayoutProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </LayoutProvider>
  </StrictMode>,
)
