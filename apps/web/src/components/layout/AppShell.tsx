import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar.tsx'
import './AppShell.css'

export interface AppShellProps {
  header: ReactNode
  children: ReactNode
}

export function AppShell({ header, children }: AppShellProps) {
  return (
    <div className="fh-app-shell">
      <Sidebar />
      <div className="fh-app-shell__main">
        {header}
        <main className="fh-app-shell__content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
