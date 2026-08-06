import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './styles/global.css'
import './styles/utilities.css'
import { AppRoot } from './AppRoot.tsx'
import { AuthProvider } from './state/AuthProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
