import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import './styles/utilities.css'
import App from './App.tsx'
import { FinanceDemoProvider } from './state/FinanceDemoProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <FinanceDemoProvider>
        <App />
      </FinanceDemoProvider>
    </BrowserRouter>
  </StrictMode>,
)
